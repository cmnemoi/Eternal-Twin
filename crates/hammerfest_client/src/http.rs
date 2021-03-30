mod errors;
mod scraper;
#[cfg(test)]
mod tests;
mod url;

use std::collections::HashMap;
use std::time::Duration;

use async_trait::async_trait;
use etwin_core::clock::Clock;
use etwin_core::hammerfest::*;
use reqwest::{Client, StatusCode};
use serde::Serialize;

use self::errors::ScraperError;
use self::url::HammerfestUrls;
use etwin_core::types::EtwinError;
use std::num::NonZeroU16;
use std::str::FromStr;

type Result<T> = std::result::Result<T, EtwinError>;

const USER_AGENT: &str = "EtwinHammerfestScraper";
const TIMEOUT: Duration = Duration::from_millis(5000);

pub struct HttpHammerfestClient<TyClock> {
  client: Client,
  clock: TyClock,
}

impl<TyClock> HttpHammerfestClient<TyClock>
where
  TyClock: Clock,
{
  pub fn new(clock: TyClock) -> Result<Self> {
    Ok(Self {
      client: Client::builder()
        .user_agent(USER_AGENT)
        .timeout(TIMEOUT)
        .redirect(reqwest::redirect::Policy::none())
        .build()?,
      clock,
    })
  }

  async fn get_html(
    &self,
    url: reqwest::Url,
    session: Option<&HammerfestSessionKey>,
  ) -> reqwest::Result<scraper::Html> {
    let mut builder = self.client.get(url);

    if let Some(key) = session {
      // No need to escape, per HammerfestSessionKey invariants.
      let session_cookie = "SID=".to_owned() + key.as_str();
      builder = builder.header(reqwest::header::COOKIE, session_cookie);
    }

    let resp = builder.send().await?;
    let text = resp.error_for_status()?.text().await?;
    Ok(scraper::Html::parse_document(&text))
  }
}

#[async_trait]
impl<TyClock> HammerfestClient for HttpHammerfestClient<TyClock>
where
  TyClock: Clock,
{
  async fn create_session(&self, options: &HammerfestCredentials) -> Result<HammerfestSession> {
    #[derive(Serialize)]
    struct LoginForm<'a> {
      login: &'a str,
      pass: &'a str,
    }

    let urls = HammerfestUrls::new(options.server);

    let now = self.clock.now();
    let resp = self
      .client
      .post(urls.login())
      .form(&LoginForm {
        login: options.username.as_str(),
        pass: options.password.as_str(),
      })
      .send()
      .await?;

    if resp.status() != StatusCode::FOUND {
      let text = resp.error_for_status()?.text().await?;
      let html = scraper::Html::parse_document(&text);
      return Err(
        if scraper::is_login_page_error(&html) {
          ScraperError::InvalidCredentials(options.server, options.username.clone())
        } else {
          ScraperError::UnexpectedResponse(urls.login())
        }
        .into(),
      );
    }

    let session_key = resp
      .cookies()
      .find(|cookie| cookie.name() == "SID")
      .map(|cookie| cookie.value().to_owned())
      .ok_or(ScraperError::MissingSessionCookie)?;
    let session_key = HammerfestSessionKey::from_str(&session_key).map_err(|_| ScraperError::InvalidSessionCookie)?;

    let html = self.get_html(urls.root(), Some(&session_key)).await?;
    let user = scraper::scrape_user_base(options.server, &html)?.ok_or(ScraperError::LoginSessionRevoked)?;
    Ok(HammerfestSession {
      ctime: now,
      atime: now,
      key: session_key,
      user,
    })
  }

  async fn test_session(
    &self,
    server: HammerfestServer,
    key: &HammerfestSessionKey,
  ) -> Result<Option<HammerfestSession>> {
    let urls = HammerfestUrls::new(server);
    let now = self.clock.now();
    let html = self.get_html(urls.root(), Some(key)).await?;
    Ok(scraper::scrape_user_base(server, &html)?.map(|user| HammerfestSession {
      ctime: now,
      atime: now,
      key: key.clone(),
      user,
    }))
  }

  async fn get_profile_by_id(
    &self,
    session: Option<&HammerfestSession>,
    options: &HammerfestGetProfileByIdOptions,
  ) -> Result<Option<HammerfestProfile>> {
    let urls = HammerfestUrls::new(options.server);
    let html = self
      .get_html(urls.user(&options.user_id), session.map(|sess| &sess.key))
      .await?;
    Ok(scraper::scrape_user_profile(options.server, options.user_id, &html)?)
  }

  async fn get_own_items(&self, session: &HammerfestSession) -> Result<HashMap<HammerfestItemId, u32>> {
    let urls = HammerfestUrls::new(session.user.server);
    let html = self.get_html(urls.inventory(), Some(&session.key)).await?;
    scraper::scrape_user_inventory(&html)?.ok_or_else(|| ScraperError::InvalidSessionCookie.into())
  }

  async fn get_own_godchildren(&self, session: &HammerfestSession) -> Result<Vec<HammerfestGodchild>> {
    let server = session.user.server;
    let urls = HammerfestUrls::new(server);
    let html = self.get_html(urls.god_children(), Some(&session.key)).await?;
    scraper::scrape_user_god_children(server, &html)?.ok_or_else(|| ScraperError::InvalidSessionCookie.into())
  }

  async fn get_own_shop(&self, session: &HammerfestSession) -> Result<HammerfestShop> {
    let urls = HammerfestUrls::new(session.user.server);
    let html = self.get_html(urls.shop(), Some(&session.key)).await?;
    scraper::scrape_user_shop(&html)?.ok_or_else(|| ScraperError::InvalidSessionCookie.into())
  }

  async fn get_forum_themes(
    &self,
    session: Option<&HammerfestSession>,
    server: HammerfestServer,
  ) -> Result<Vec<HammerfestForumTheme>> {
    let urls = HammerfestUrls::new(server);
    let html = self.get_html(urls.forum_home(), session.map(|sess| &sess.key)).await?;
    Ok(scraper::scrape_forum_home(server, &html)?)
  }

  async fn get_forum_theme_page(
    &self,
    session: Option<&HammerfestSession>,
    server: HammerfestServer,
    theme_id: HammerfestForumThemeId,
    page1: NonZeroU16,
  ) -> Result<HammerfestForumThemePage> {
    let urls = HammerfestUrls::new(server);
    let html = self
      .get_html(urls.forum_theme(theme_id, page1), session.map(|sess| &sess.key))
      .await?;
    Ok(scraper::scrape_forum_theme(server, &html)?)
  }

  async fn get_forum_thread_page(
    &self,
    session: Option<&HammerfestSession>,
    server: HammerfestServer,
    thread_id: HammerfestForumThreadId,
    page1: NonZeroU16,
  ) -> Result<HammerfestForumThreadPage> {
    let urls = HammerfestUrls::new(server);
    let html = self
      .get_html(urls.forum_thread(thread_id, page1), session.map(|sess| &sess.key))
      .await?;
    Ok(scraper::scrape_forum_thread(server, thread_id, &html)?)
  }
}

#[cfg(feature = "neon")]
impl<TyClock> neon::prelude::Finalize for HttpHammerfestClient<TyClock> where TyClock: Clock {}
