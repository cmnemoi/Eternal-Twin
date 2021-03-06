// WARNING: DO NOT EDIT THE FILE MANUALLY!
// This file was auto-generated by `cargo xtask kotlin` from the definitions in `xtask/src/metagen/etwin.rs`.

package net.eternaltwin.dinoparc

import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder

@Serializable(with = DinoparcDinozElementLevel.Serializer::class)
data class DinoparcDinozElementLevel(
  val inner: UShort,
) {
  constructor(value: UByte): this(value.toUShort())
  fun toByte(): Byte = this.inner.toByte()
  fun toShort(): Short = this.inner.toShort()
  fun toInt(): Int = this.inner.toInt()
  fun toLong(): Long = this.inner.toLong()
  fun toUByte(): UByte = this.inner.toUByte()
  fun toUShort(): UShort = this.inner
  fun toUInt(): UInt = this.inner.toUInt()
  fun toULong(): ULong = this.inner.toULong()

  companion object {
    @JvmStatic
    fun fromByte(value: Byte): DinoparcDinozElementLevel = DinoparcDinozElementLevel(value.toUShort())
    @JvmStatic
    fun fromShort(value: Short): DinoparcDinozElementLevel = DinoparcDinozElementLevel(value.toUShort())
    @JvmStatic
    fun fromInt(value: Int): DinoparcDinozElementLevel = DinoparcDinozElementLevel(value.toUShort())
    @JvmStatic
    fun fromLong(value: Long): DinoparcDinozElementLevel = DinoparcDinozElementLevel(value.toUShort())
    @JvmStatic
    fun fromUByte(value: UByte): DinoparcDinozElementLevel = DinoparcDinozElementLevel(value.toUShort())
    @JvmStatic
    fun fromUShort(value: UShort): DinoparcDinozElementLevel = DinoparcDinozElementLevel(value)
    @JvmStatic
    fun fromUInt(value: UInt): DinoparcDinozElementLevel = DinoparcDinozElementLevel(value.toUShort())
    @JvmStatic
    fun fromULong(value: ULong): DinoparcDinozElementLevel = DinoparcDinozElementLevel(value.toUShort())
  }

  fun toDebugString(): String = "DinoparcDinozElementLevel(${this})"

  override fun toString(): String = this.inner.toString()

  object Serializer : KSerializer<DinoparcDinozElementLevel> {
    override val descriptor: SerialDescriptor =
      PrimitiveSerialDescriptor("net.eternaltwin.dinoparc.DinoparcDinozElementLevel", PrimitiveKind.LONG)

    override fun serialize(encoder: Encoder, value: DinoparcDinozElementLevel) =
      encoder.encodeLong(value.inner.toLong())

    override fun deserialize(decoder: Decoder): DinoparcDinozElementLevel =
      fromLong(decoder.decodeLong())
  }
}
