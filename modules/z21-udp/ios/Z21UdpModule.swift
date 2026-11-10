import ExpoModulesCore
import Network

public class Z21UdpModule: Module {
  private var sockets: [Int: UdpSocket] = [:]
  private var nextId = 1
  private let lock = NSLock()

  public func definition() -> ModuleDefinition {
    Name("Z21Udp")

    Events("onMessage", "onError")

    AsyncFunction("open") { (host: String, port: Int) throws -> Int in
      guard let nwPort = NWEndpoint.Port(rawValue: UInt16(clamping: port)), port > 0 else {
        throw InvalidPortException(port)
      }
      self.lock.lock()
      let id = self.nextId
      self.nextId += 1
      self.lock.unlock()

      let socket = UdpSocket(
        id: id,
        host: host,
        port: nwPort,
        onMessage: { [weak self] data in
          self?.sendEvent("onMessage", ["socketId": id, "data": data])
        },
        onError: { [weak self] message in
          self?.sendEvent("onError", ["socketId": id, "message": message])
        }
      )
      self.lock.lock()
      self.sockets[id] = socket
      self.lock.unlock()
      socket.start()
      return id
    }

    Function("send") { (socketId: Int, data: [Int]) in
      self.socket(socketId)?.send(Data(data.map { UInt8(truncatingIfNeeded: $0) }))
    }

    Function("close") { (socketId: Int) in
      self.lock.lock()
      let socket = self.sockets.removeValue(forKey: socketId)
      self.lock.unlock()
      socket?.close()
    }

    OnDestroy {
      self.lock.lock()
      let all = Array(self.sockets.values)
      self.sockets.removeAll()
      self.lock.unlock()
      all.forEach { $0.close() }
    }
  }

  private func socket(_ id: Int) -> UdpSocket? {
    lock.lock()
    defer { lock.unlock() }
    return sockets[id]
  }
}

final class InvalidPortException: GenericException<Int> {
  override var reason: String {
    "Invalid UDP port: \(param)"
  }
}

// Pause after a receive error so a persistent error cannot spin the CPU.
private let errorPause: DispatchTimeInterval = .milliseconds(500)

// One UDP "connection" to the central unit (Network.framework). Sends and
// receives only to/from host:port. Everything runs on a private serial queue,
// so sends keep their order.
final class UdpSocket {
  private let connection: NWConnection
  private let queue: DispatchQueue
  private let onMessage: ([Int]) -> Void
  private let onError: (String) -> Void
  private var closed = false
  private var pendingSends = 0

  init(
    id: Int,
    host: String,
    port: NWEndpoint.Port,
    onMessage: @escaping ([Int]) -> Void,
    onError: @escaping (String) -> Void
  ) {
    // The layout's Wi-Fi usually has no internet access; never fall back to
    // mobile data (Android binds the socket to Wi-Fi for the same reason).
    let parameters = NWParameters.udp
    parameters.prohibitedInterfaceTypes = [.cellular]
    self.connection = NWConnection(host: NWEndpoint.Host(host), port: port, using: parameters)
    self.queue = DispatchQueue(label: "z21-udp-\(id)")
    self.onMessage = onMessage
    self.onError = onError
  }

  func start() {
    connection.stateUpdateHandler = { [weak self] state in
      switch state {
      case .failed(let error), .waiting(let error):
        // .waiting typically means no route, or the local network permission
        // was denied. The JS side decides from timeouts when to give up.
        self?.onError(error.localizedDescription)
      default:
        break
      }
    }
    connection.start(queue: queue)
    receive()
  }

  func send(_ data: Data) {
    queue.async {
      guard !self.closed else { return }
      self.pendingSends += 1
      self.connection.send(content: data, completion: .contentProcessed { [weak self] error in
        // Completions run on `queue` (the queue passed to start()).
        guard let self = self else { return }
        self.pendingSends -= 1
        if let error = error, !self.closed {
          self.onError(error.localizedDescription)
        }
        if self.closed && self.pendingSends == 0 {
          self.connection.cancel()
        }
      })
    }
  }

  // Cancels once pending sends have been processed, so a final LAN_LOGOFF is
  // not dropped.
  func close() {
    queue.async {
      guard !self.closed else { return }
      self.closed = true
      if self.pendingSends == 0 {
        self.connection.cancel()
      }
    }
  }

  private func receive() {
    connection.receiveMessage { [weak self] data, _, _, error in
      guard let self = self, !self.closed else { return }
      if let data = data, !data.isEmpty {
        self.onMessage(data.map { Int($0) })
      }
      guard let error = error else {
        self.receive()
        return
      }
      self.onError(error.localizedDescription)
      switch self.connection.state {
      case .failed(_), .cancelled:
        // A failed connection completes every receive at once with an error.
        // Stop here; the JS side times out and opens a new socket.
        return
      default:
        // E.g. ICMP port unreachable while the central unit is offline.
        self.queue.asyncAfter(deadline: .now() + errorPause) { [weak self] in
          guard let self = self, !self.closed else { return }
          self.receive()
        }
      }
    }
  }
}
