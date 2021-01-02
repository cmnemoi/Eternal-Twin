use crate::core::Instant;
use async_trait::async_trait;
use once_cell::sync::Lazy;
use regex::Regex;
use std::error::Error;
use std::collections::{HashMap, HashSet};
#[cfg(feature = "serde")]
use serde::{Deserialize, Serialize};
#[cfg(feature = "sqlx")]
use sqlx::{Database, database, Postgres, postgres};
use std::str::FromStr;
use std::fmt;

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum HammerfestServer {
  #[cfg_attr(feature = "serde", serde(rename = "hammerfest.fr"))]
  HammerfestFr,
  #[cfg_attr(feature = "serde", serde(rename = "hfest.net"))]
  HfestNet,
  #[cfg_attr(feature = "serde", serde(rename = "hammerfest.es"))]
  HammerfestEs,
}

impl HammerfestServer {
  pub const fn as_str(&self) -> &'static str {
    match self {
      Self::HammerfestFr => "hammerfest.fr",
      Self::HfestNet => "hfest.net",
      Self::HammerfestEs => "hammerfest.es",
    }
  }
}

#[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestServerParseError;

impl fmt::Display for HammerfestServerParseError {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    write!(f, "HammerfestServerParseError")
  }
}

impl Error for HammerfestServerParseError {}

impl FromStr for HammerfestServer {
  type Err = HammerfestServerParseError;

  fn from_str(s: &str) -> Result<Self, Self::Err> {
    match s {
      "hammerfest.fr" => Ok(Self::HammerfestFr),
      "hfest.net" => Ok(Self::HfestNet),
      "hammerfest.es" => Ok(Self::HammerfestEs),
      _ => Err(HammerfestServerParseError),
    }
  }
}

#[cfg(feature = "sqlx")]
impl sqlx::Type<Postgres> for HammerfestServer {
  fn type_info() -> postgres::PgTypeInfo {
    postgres::PgTypeInfo::with_name("hammerfest_server")
  }

  fn compatible(ty: &postgres::PgTypeInfo) -> bool {
    *ty == Self::type_info() || <&str as sqlx::Type<Postgres>>::compatible(ty)
  }
}

#[cfg(feature = "sqlx")]
impl<'r, Db: Database> sqlx::Decode<'r, Db> for HammerfestServer
  where &'r str: sqlx::Decode<'r, Db>
{
  fn decode(value: <Db as database::HasValueRef<'r>>::ValueRef) -> Result<HammerfestServer, Box<dyn Error + 'static + Send + Sync>> {
    let value: &str = <&str as sqlx::Decode<Db>>::decode(value)?;
    Ok(value.parse()?)
  }
}

#[cfg(feature = "sqlx")]
impl<'q, Db: Database> sqlx::Encode<'q, Db> for HammerfestServer
  where &'q str: sqlx::Encode<'q, Db>
{
  fn encode_by_ref(&self, buf: &mut <Db as database::HasArguments<'q>>::ArgumentBuffer) -> sqlx::encode::IsNull {
    self.as_str().encode(buf)
  }
}

#[cfg_attr(feature = "sqlx", derive(sqlx::Type), sqlx(transparent, rename = "hammerfest_username"))]
#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash, )]
pub struct HammerfestUsername(String);

impl HammerfestUsername {
  pub const PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[0-9A-Za-z]{1,12}$").unwrap());

  pub fn try_from_string(raw: String) -> Result<Self, ()> {
    if Self::PATTERN.is_match(&raw) {
      Ok(Self(raw))
    } else {
      Err(())
    }
  }

  pub fn as_str(&self) -> &str {
    &self.0
  }
}


#[cfg_attr(feature = "sqlx", derive(sqlx::Type), sqlx(transparent, rename = "hammerfest_user_id"))]
#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestUserId(String);

impl HammerfestUserId {
  pub const PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[1-9][0-9]{0,8}$").unwrap());

  pub fn try_from_string(raw: String) -> Result<Self, ()> {
    if Self::PATTERN.is_match(&raw) {
      Ok(Self(raw))
    } else {
      Err(())
    }
  }

  pub fn as_str(&self) -> &str {
    &self.0
  }
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestSessionKey(String);

impl HammerfestSessionKey {
  pub const PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[0-9a-z]{26}$").unwrap());

  pub fn try_from_string(raw: String) -> Result<Self, ()> {
    if Self::PATTERN.is_match(&raw) {
      Ok(Self(raw))
    } else {
      Err(())
    }
  }

  pub fn as_str(&self) -> &str {
    &self.0
  }
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestCredentials {
  pub server: HammerfestServer,
  pub username: HammerfestUsername,
  pub password: String,
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct TaggedShortHammerfestUser {
  r#type: String,
  #[cfg_attr(feature = "serde", serde(flatten))]
  inner: ShortHammerfestUser,
}

impl TaggedShortHammerfestUser {
  pub fn new(inner: ShortHammerfestUser) -> Self {
    Self {
      r#type: String::from("HammerfestUser"),
      inner,
    }
  }
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct ShortHammerfestUser {
  pub server: HammerfestServer,
  pub id: HammerfestUserId,
  pub username: HammerfestUsername,
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestSession {
  pub ctime: Instant,
  pub atime: Instant,
  pub key: HammerfestSessionKey,
  pub user: ShortHammerfestUser,
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestGetProfileByIdOptions {
  pub server: HammerfestServer,
  pub user_id: HammerfestUserId,
}


#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HammerfestProfile {
  pub user: ShortHammerfestUser,
  #[cfg_attr(feature = "serde", serde(default))]
  #[cfg_attr(feature = "serde", serde(skip_serializing_if = "Option::is_none"))]
  #[cfg_attr(feature = "serde", serde(deserialize_with = "deserialize_optional"))]
  pub email: Option<Option<String>>,
  pub best_score: u32,
  pub best_level: u32,
  pub has_carrot: bool,
  pub season_score: u32,
  pub rank: u8,
  // TODO: limit 0 <= r <= 4
  pub hall_of_fame: Option<HammerfestHallOfFameMessage>,
  pub items: HashSet<HammerfestItemId>,
  // TODO: limit size <= 1000
  pub quests: HashMap<HammerfestQuestId, HammerfestQuestStatus>, // TODO: limit size <= 100
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestQuestId(String);

impl HammerfestQuestId {
  pub const PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[0-9]{1,9}$").unwrap());

  pub fn try_from_string(raw: String) -> Result<Self, ()> {
    if Self::PATTERN.is_match(&raw) {
      Ok(Self(raw))
    } else {
      Err(())
    }
  }

  pub fn as_str(&self) -> &str {
    &self.0
  }
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum HammerfestQuestStatus {
  None,
  Pending,
  Complete,
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestHallOfFameMessage {
  pub date: Instant,
  pub message: String,
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestItemId(String);

impl HammerfestItemId {
  pub const PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^0|[1-9][0-9]{0,3}$").unwrap());

  pub fn try_from_string(raw: String) -> Result<Self, ()> {
    if Self::PATTERN.is_match(&raw) {
      Ok(Self(raw))
    } else {
      Err(())
    }
  }

  pub fn as_str(&self) -> &str {
    &self.0
  }
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestGodChild {
  pub user: ShortHammerfestUser,
  pub tokens: u32,
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestShop {
  pub tokens: u32,
  pub weekly_tokens: u32,
  pub purchased_tokens: Option<u32>,
  pub has_quest_bonus: bool,
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestForumDate {
  pub month: u8,
  // TODO: limit 1 <= m <= 12
  pub day: u8,
  // TODO: limit 1 <= d <= 31
  pub weekday: u8,
  // TODO: limit 1 <= w <= 7
  pub hour: u8,
  // TODO: limit 0 <= h <= 23
  pub minute: u8, // TODO: limit 0 <= m <= 59
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestForumThemeId(String);

impl HammerfestForumThemeId {
  pub const PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[0-9]{1,2}$").unwrap());

  pub fn try_from_string(raw: String) -> Result<Self, ()> {
    if Self::PATTERN.is_match(&raw) {
      Ok(Self(raw))
    } else {
      Err(())
    }
  }

  pub fn as_str(&self) -> &str {
    &self.0
  }
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct ShortHammerfestForumTheme {
  pub server: HammerfestServer,
  pub id: HammerfestForumThemeId,
  pub name: String,
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestForumTheme {
  #[cfg_attr(feature = "serde", serde(flatten))]
  pub short: ShortHammerfestForumTheme,
  pub description: String,
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestForumThemePage {
  pub theme: ShortHammerfestForumTheme,
  pub sticky: Vec<HammerfestForumThread>,
  // TODO: limit size <= 15
  pub threads: HammerfestForumThreadListing,
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestForumThreadListing {
  pub page1: u32,
  pub pages: u32,
  pub items: Vec<HammerfestForumThread>, // TODO: limit size <= 15
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestForumThreadId(String);

impl HammerfestForumThreadId {
  pub const PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[0-9]{1,9}$").unwrap());

  pub fn try_from_string(raw: String) -> Result<Self, ()> {
    if Self::PATTERN.is_match(&raw) {
      Ok(Self(raw))
    } else {
      Err(())
    }
  }

  pub fn as_str(&self) -> &str {
    &self.0
  }
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct ShortHammerfestForumThread {
  pub server: HammerfestServer,
  pub id: HammerfestForumThreadId,
  pub name: String,
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestForumThread {
  #[cfg_attr(feature = "serde", serde(flatten))]
  pub short: ShortHammerfestForumThread,
  pub author: ShortHammerfestUser,
  pub last_message_date: HammerfestForumDate,
  pub reply_count: u32,
  pub is_sticky: bool,
  pub is_closed: bool,
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestForumThreadPage {
  pub theme: ShortHammerfestForumTheme,
  pub thread: ShortHammerfestForumThread,
  pub messages: HammerfestForumPostListing,
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestForumPostListing {
  pub page1: u32,
  pub pages: u32,
  pub items: Vec<HammerfestForumPost>, // TODO: limit size <= 15
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestForumPostId(String);

impl HammerfestForumPostId {
  pub const PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[0-9]{1,9}$").unwrap());

  pub fn try_from_string(raw: String) -> Result<Self, ()> {
    if Self::PATTERN.is_match(&raw) {
      Ok(Self(raw))
    } else {
      Err(())
    }
  }

  pub fn as_str(&self) -> &str {
    &self.0
  }
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestForumPost {
  pub id: Option<HammerfestForumPostId>,
  pub author: HammerfestForumPostAuthor,
  pub ctime: HammerfestForumDate,
  pub content: String, // TODO: HtmlText?
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct HammerfestForumPostAuthor {
  #[cfg_attr(feature = "serde", serde(flatten))]
  pub user: ShortHammerfestUser,
  pub has_carrot: bool,
  pub rank: u8,
  // TODO: limit 0 <= r <= 4
  pub role: HammerfestForumRole,
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum HammerfestForumRole {
  None,
  Moderator,
  Administrator,
}

#[cfg_attr(feature = "serde", derive(Serialize, Deserialize))]
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct GetHammerfestUserOptions {
  pub server: HammerfestServer,
  pub id: HammerfestUserId,
  pub time: Option<Instant>,
}

#[async_trait]
pub trait HammerfestClient: Send + Sync {
  async fn create_session(&self, options: &HammerfestCredentials) -> Result<HammerfestSession, Box<dyn Error>>;

  async fn test_session(&self, server: HammerfestServer, key: &HammerfestSessionKey) -> Result<Option<HammerfestSession>, Box<dyn Error>>;

  async fn get_profile_by_id(&self, session: Option<&HammerfestSession>, options: &HammerfestGetProfileByIdOptions) -> Result<Option<HammerfestProfile>, Box<dyn Error>>;

  async fn get_own_items(&self, session: &HammerfestSession) -> Result<HashMap<HammerfestItemId, u32>, Box<dyn Error>>;

  async fn get_own_god_children(&self, session: &HammerfestSession) -> Result<Vec<HammerfestGodChild>, Box<dyn Error>>;

  async fn get_own_shop(&self, session: &HammerfestSession) -> Result<HammerfestShop, Box<dyn Error>>;

  async fn get_forum_themes(&self, session: Option<&HammerfestSession>, server: HammerfestServer) -> Result<Vec<HammerfestForumTheme>, Box<dyn Error>>;

  async fn get_forum_theme_page(&self, session: Option<&HammerfestSession>, server: HammerfestServer, theme_id: HammerfestForumThemeId, page1: u32) -> Result<HammerfestForumThemePage, Box<dyn Error>>;

  async fn get_forum_thread_page(&self, session: Option<&HammerfestSession>, server: HammerfestServer, thread_id: HammerfestForumThreadId, page1: u32) -> Result<HammerfestForumThreadPage, Box<dyn Error>>;
}

#[cfg(feature = "serde")]
fn deserialize_optional<'de, T, D>(deserializer: D) -> Result<Option<Option<T>>, D::Error>
  where T: Deserialize<'de>, D: serde::Deserializer<'de> {
  Ok(Some(Option::deserialize(deserializer)?))
}

#[async_trait]
pub trait HammerfestStore: Send + Sync {
  async fn get_short_user(&self, options: &GetHammerfestUserOptions) -> Result<Option<ShortHammerfestUser>, Box<dyn Error>>;

  async fn touch_short_user(&self, options: &ShortHammerfestUser) -> Result<ShortHammerfestUser, Box<dyn Error>>;
}