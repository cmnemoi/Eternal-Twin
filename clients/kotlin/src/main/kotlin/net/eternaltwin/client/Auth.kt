package net.eternaltwin.client

import okhttp3.Request
import java.net.http.HttpRequest
import java.nio.charset.Charset
import java.util.*

private val COLON_UTF8_BYTES = ":".toByteArray(Charset.forName("UTF-8"))

class Auth private constructor(private val authorizationHeader: String?) {
  internal fun apply(builder: Request.Builder): Request.Builder {
    if (this.authorizationHeader != null) {
      return builder.header("Authorization", this.authorizationHeader)
    } else {
      return builder
    }
  }

  companion object {
    @JvmField
    val GUEST = Auth(null)

    @JvmStatic
    fun fromCredentials(login: String, password: ByteArray): Auth {
      val loginBytes = login.toByteArray(Charset.forName("UTF-8"))
      val credentialsBytes = loginBytes + COLON_UTF8_BYTES + password
      val encoded = Base64.getEncoder().encodeToString(credentialsBytes)
      return Auth("Basic $encoded")
    }

    @JvmStatic
    fun fromToken(key: String): Auth {
      return Auth("Bearer $key")
    }
  }
}
