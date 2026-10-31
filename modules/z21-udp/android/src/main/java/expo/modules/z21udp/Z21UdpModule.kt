package expo.modules.z21udp

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

class Z21UdpModule : Module() {
  private val sockets = ConcurrentHashMap<Int, UdpSocket>()
  private val nextId = AtomicInteger(1)

  override fun definition() = ModuleDefinition {
    Name("Z21Udp")

    Events("onMessage", "onError")

    AsyncFunction("open") { host: String, port: Int ->
      val id = nextId.getAndIncrement()
      val socket = UdpSocket(
        id = id,
        host = host,
        port = port,
        context = appContext.reactContext,
        onMessage = { data -> sendEvent("onMessage", mapOf("socketId" to id, "data" to data)) },
        onError = { message -> sendEvent("onError", mapOf("socketId" to id, "message" to message)) }
      )
      try {
        socket.open()
      } catch (e: Exception) {
        socket.close()
        throw e
      }
      sockets[id] = socket
      id
    }

    Function("send") { socketId: Int, data: List<Int> ->
      sockets[socketId]?.send(ByteArray(data.size) { data[it].toByte() })
      Unit
    }

    Function("close") { socketId: Int ->
      sockets.remove(socketId)?.close()
      Unit
    }

    OnDestroy {
      sockets.values.forEach { it.close() }
      sockets.clear()
    }
  }
}
