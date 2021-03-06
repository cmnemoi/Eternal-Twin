use etwin_core::dinoparc::{DinoparcServer, DinoparcUserIdParseError, DinoparcUsername, DinoparcUsernameParseError};
use reqwest::StatusCode;
use std::num::ParseIntError;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ScraperError {
  #[error("Failed to login due to unexpected login response")]
  UnexpectedLoginResponse,
  #[error("Invalid credentials on {} for username: {}", .0.as_str(), .1.as_str())]
  InvalidCredentials(DinoparcServer, DinoparcUsername),
  #[error("Missing Dinoparc session cookie from response")]
  MissingSessionCookie,
  #[error("Dinoparc session cookie is invalid or malformed")]
  InvalidSessionCookie,
  #[error("Failed to login due to unexpected ad tracking response")]
  UnexpectedAdTrackingResponse,
  #[error("Failed to login due to unexpected login confirmation response: {:?}", .0)]
  UnexpectedLoginConfirmationResponse(StatusCode),
  #[error("Zero or many <html> nodes, exactly one was expected")]
  NonUniqueHtml,
  #[error("Failed to detect server: missing or unknown html[lang]")]
  ServerDetectionFailure,
  // #[error("Session was revoked by Hammerfest during login")]
  // LoginSessionRevoked,
  // #[error("Hammerfest returned an unexpected response for page {}", .0)]
  // UnexpectedResponse(Url),
  // #[error("Failed to find fragment in HTML for {}", .0)]
  // HtmlFragmentNotFound(String),
  // #[error("Found too many fragments in HTML for {}", .0)]
  // TooManyHtmlFragments(String),
  // #[error("Failed to parse integer value '{}'", .0)]
  // InvalidInteger(String, #[source] std::num::ParseIntError),
  // #[error("Failed to parse date '{}'", .0)]
  // InvalidDate(String, #[source] Option<chrono::format::ParseError>),
  #[error("Invalid dinoparc user id '{:?}'", .0)]
  InvalidUserId(String, DinoparcUserIdParseError),
  #[error("Invalid dinoparc username '{:?}'", .0)]
  InvalidUsername(String, DinoparcUsernameParseError),
  #[error("Unexpected bank cashFrame argument {:?}: {}", .0, .1)]
  UnexpectedCashFrameArgument(String, &'static str),
  #[error("Zero or many cashFrame calls, exactly one was expected")]
  NonUniqueCashFrameCall,
  #[error("Zero or many menus, exactly one was expected")]
  NonUniqueMenu,
  #[error("Zero or many usernames in menu, exactly one was expected")]
  NonUniqueUsername,
  #[error("Zero or many username text nodes in menu, exactly one was expected")]
  NonUniqueUsernameText,
  #[error("Zero or many coin counts, exactly one was expected")]
  NonUniqueCoinSpan,
  #[error("Zero or many coin counts, exactly one was expected")]
  NonUniqueCoinText,
  #[error("Invalid coin count {:?}", .0)]
  InvalidCoinCount(String),
  #[error("Zero or many dinoz list blocks, exactly one was expected")]
  NonUniqueDinozListBlock,
  #[error("Zero or many dinoz list, exactly one was expected")]
  NonUniqueDinozList,
  #[error("Zero or many dinoz link, exactly one was expected")]
  NonUniqueDinozLink,
  #[error("Missing href attribute on link")]
  MissingLinkHref,
  #[error("Invalid dinoz link {:?}", .0)]
  InvalidLinkHref(String),
  #[error("Missing action attribute on form")]
  MissingFormAction,
  #[error("Invalid form action link {:?}", .0)]
  InvalidFormAction(String),
  #[error("Zero or many `r` param in link, exactly one was expected")]
  NonUniqueDinoparcRequest,
  #[error("Zero or many dinoz id in link, exactly one was expected")]
  NonUniqueDinozIdInLink,
  #[error("Invalid dinoz id {:?}", .0)]
  InvalidDinozId(String),
  #[error("Zero or many dinoz name, exactly one was expected")]
  NonUniqueDinozName,
  #[error("Zero or many dinoz name text, exactly one was expected")]
  NonUniqueDinozNameText,
  #[error("Invalid dinoz name {:?}", .0)]
  InvalidDinozName(String),
  #[error("Zero or many location name, exactly one was expected")]
  NonUniqueLocationName,
  #[error("Zero or many location name text, exactly one was expected")]
  NonUniqueLocationNameText,
  #[error("Invalid location name {:?}", .0)]
  InvalidLocationName(String),
  #[error("Zero or many inventory table, exactly one was expected")]
  NonUniqueInventory,
  #[error("Zero or many help links in inventory row, exactly one was expected")]
  NonUniqueItemHelpLink,
  #[error("Zero or many item id in link, exactly one was expected")]
  NonUniqueItemIdInLink,
  #[error("Invalid item id {:?}", .0)]
  InvalidItemId(String),
  #[error("Zero or many item count in row, exactly one was expected")]
  NonUniqueItemCount,
  #[error("Zero or many item count texts, exactly one was expected")]
  NonUniqueItemCountText,
  #[error("Invalid item count {:?}", .0)]
  InvalidItemCount(String),
  #[error("Unexpected reward box: expected regular or epic")]
  UnexpectedRewardBox,
  #[error("Duplicate regular reward box, expected zero or one")]
  DuplicateRegularRewardBox,
  #[error("Duplicate epic reward box, expected zero or one")]
  DuplicateEpicRewardBox,
  #[error("2 or more images for epic reward cell, zero or one expected")]
  MultipleEpicRewardImages,
  #[error("Invalid reward id {:?}", .0)]
  InvalidRewardId(u64),
  #[error("Invalid epic reward {:?}", .0)]
  InvalidEpicReward(String),
  #[error("Zero or many exchange table, exactly one was expected")]
  NonUniqueExchangeTable,
  #[error("Unexpected exchange table layout")]
  UnexpectedExchangeTableLayout,
  #[error("Zero or many exchange target, exactly one was expected")]
  NonUniqueExchangeTarget,
  #[error("Zero or many bill count, exactly one was expected")]
  NonUniqueBillCount,
  #[error("Invalid bill count '{:?}'", .0)]
  InvalidBillCount(String, ParseIntError),
  #[error("Zero or many exchange dinoz list, exactly one was expected")]
  NonUniqueExchangeDinozList,
  #[error("Missing value attribute on exchange dinoz")]
  MissingExchangeDinozId,
  #[error("Zero or many exchange dinoz text, exactly one was expected")]
  NonUniqueExchangeDinozText,
  #[error("Invalid exchange dinoz name and level '{:?}'", .0)]
  InvalidExchangeDinozNameLevel(String),
  #[error("Zero or many user id in link, exactly one was expected")]
  NonUniqueUserIdInLink,
  #[error("Zero or many content pane, exactly one was expected")]
  NonUniqueContentPane,
  #[error("Zero or many dinozView table, exactly one was expected")]
  NonUniqueDinozView,
  #[error("Zero or many dinoz pane, exactly one was expected")]
  NonUniqueDinozPane,
  #[error("Zero or many dinoz new name form, exactly one was expected")]
  NonUniqueDinozNameForm,
  #[error("Zero or many dinoz skin FlashVars node, exactly one was expected")]
  NonUniqueDinozSkinFlashVars,
  #[error("Missing `value` attr on FlashVars node")]
  MissingFlashVarsValue,
  #[error("Zero or many dinoz skin `data` vars, exactly one was expected")]
  NonUniqueDinozSkinData,
  #[error("Invalid dinoz skin code {:?}", .0)]
  InvalidDinozSkin(String),
  #[error("Zero or many dinoz `def` table, exactly one was expected")]
  NonUniqueDinozDefTable,
  #[error("Zero or many dinoz life value, exactly one was expected")]
  NonUniqueDinozLifeValue,
  #[error("Zero or many dinoz life value text, exactly one was expected")]
  NonUniqueDinozLifeValueText,
  #[error("Invalid life value {:?}", .0)]
  InvalidDinozLifeValue(String),
  #[error("Zero or many dinoz level, exactly one was expected")]
  NonUniqueDinozLevel,
  #[error("Missing dinoz level text")]
  MissingDinozLevelText,
  #[error("Missing dinoz level decimal number in text")]
  MissingDinozLevelDecimal,
  #[error("Invalid dinoz level {:?}", .0)]
  InvalidDinozLevel(String),
  #[error("Zero or many dinoz experience, exactly one was expected")]
  NonUniqueDinozExperience,
  #[error("Zero or many dinoz experience value, exactly one was expected")]
  NonUniqueDinozExperienceValue,
  #[error("Zero or many dinoz experience value text, exactly one was expected")]
  NonUniqueDinozExperienceValueText,
  #[error("Invalid experience value {:?}", .0)]
  InvalidDinozExperienceValue(String),
  #[error("Zero or many dinoz danger, exactly one was expected")]
  NonUniqueDinozDanger,
  #[error("Missing dinoz danger text, exactly one was expected")]
  MissingDinozDangerText,
  #[error("Invalid dinoz danger {:?}", .0)]
  InvalidDinozDanger(String),
  #[error("Zero or many dinoz element list, exactly one was expected")]
  NonUniqueDinozElementList,
  #[error("Zero or many dinoz element text, exactly one was expected")]
  NonUniqueDinozElementText,
  #[error("Invalid dinoz element value {:?}", .0)]
  InvalidDinozElement(String),
  #[error("Invalid dinoz element count, expected 5 got {:?}", .0)]
  InvalidDinozElementCount(u64),
  #[error("Zero or many dinoz skill list, exactly one was expected")]
  NonUniqueDinozSkillList,
  #[error("Zero or many dinoz skill name, exactly one was expected")]
  NonUniqueDinozSkillName,
  #[error("Zero or many dinoz skill name text, exactly one was expected")]
  NonUniqueDinozSkillNameText,
  #[error("Invalid dinoz skill name {:?}", .0)]
  InvalidSkillName(String),
  #[error("Zero or many dinoz skill level, exactly one was expected")]
  NonUniqueDinozSkillLevel,
  #[error("Missing `src` attribute on image")]
  MissingImgSrc,
  #[error("Invalid dinoz skill level {:?}", .0)]
  InvalidDinozSkillLevel(String),
  #[error("Invalid percentage {:?}", .0)]
  InvalidPercentage(String),
  #[error("Zero or many actions pane, exactly one was expected")]
  NonUniqueActionsPane,
  #[error("Zero or many place pane, exactly one was expected")]
  NonUniquePlacePane,
  #[error("Zero or many place link, exactly one was expected")]
  NonUniquePlaceLink,
  #[error("HTTP Error")]
  HttpError(#[from] reqwest::Error),
}
