package net.eternaltwin.dinoparc

import JSON_FORMAT
import kotlinx.serialization.*

/**
 * Dinoparc reward collection.
 */
@Serializable
data class DinoparcCollection constructor(
  val rewards: Set<DinoparcRewardId>,
  @SerialName("epic_rewards")
  val epicRewards: Set<DinoparcRewardId>,
) {
  companion object {
    @JvmStatic
    fun fromJsonString(jsonString: String): DinoparcCollection = JSON_FORMAT.decodeFromString(jsonString)

    @JvmStatic
    fun toJsonString(value: DinoparcCollection): String = JSON_FORMAT.encodeToString(value)
  }
}
