package expo.modules.z21udp

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import java.io.IOException
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.util.concurrent.Executors
import kotlin.concurrent.thread

// Largest UDP payload the Z21 sends (fits an Ethernet MTU).
private const val MAX_DATAGRAM_SIZE = 1472

// Pause after a receive error so a persistent error cannot spin the CPU.
private const val ERROR_PAUSE_MS = 500L

// One UDP socket "connected" to the central unit: it sends only to host:port
// and receives only from there. Receiving runs on its own thread; sends run on
// a single-thread executor so they keep their order and never block the JS
// thread.
internal class UdpSocket(
  private val id: Int,
  private val host: String,
  private val port: Int,
  private val context: Context?,
  private val onMessage: (List<Int>) -> Unit,
  private val onError: (String) -> Unit
) {
  private val socket = DatagramSocket()
  private val sender = Executors.newSingleThreadExecutor()

  @Volatile
  private var closed = false

  fun open() {
    bindToWifi()
    socket.connect(InetAddress.getByName(host), port)
    thread(name = "z21-udp-receive-$id", isDaemon = true) { receiveLoop() }
  }

  fun send(bytes: ByteArray) {
    if (closed) return
    sender.execute {
      try {
        socket.send(DatagramPacket(bytes, bytes.size))
      } catch (e: IOException) {
        if (!closed) onError(e.message ?: e.javaClass.simpleName)
      }
    }
  }

  // Queued after any pending sends, so a final LAN_LOGOFF still goes out.
  fun close() {
    sender.execute {
      closed = true
      socket.close()
    }
    sender.shutdown()
  }

  private fun receiveLoop() {
    val buffer = ByteArray(MAX_DATAGRAM_SIZE)
    while (!closed) {
      val packet = DatagramPacket(buffer, buffer.size)
      try {
        socket.receive(packet)
      } catch (e: IOException) {
        if (closed || socket.isClosed) break
        // E.g. PortUnreachableException while the central unit is offline.
        // Keep listening; the JS side decides when the connection is lost.
        onError(e.message ?: e.javaClass.simpleName)
        try {
          Thread.sleep(ERROR_PAUSE_MS)
        } catch (_: InterruptedException) {
          break
        }
        continue
      }
      val data = ArrayList<Int>(packet.length)
      for (i in 0 until packet.length) {
        data.add(buffer[i].toInt() and 0xFF)
      }
      onMessage(data)
    }
  }

  // The layout's Wi-Fi usually has no internet access. Android may then route
  // traffic over mobile data instead, so bind the socket to Wi-Fi explicitly
  // when a Wi-Fi network exists. Without one (e.g. Ethernet), use the default.
  private fun bindToWifi() {
    val connectivity =
      context?.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return
    @Suppress("DEPRECATION")
    val wifi = connectivity.allNetworks.firstOrNull { network ->
      connectivity.getNetworkCapabilities(network)
        ?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
    } ?: return
    try {
      wifi.bindSocket(socket)
    } catch (e: IOException) {
      onError("Could not bind to Wi-Fi: ${e.message}")
    }
  }
}
