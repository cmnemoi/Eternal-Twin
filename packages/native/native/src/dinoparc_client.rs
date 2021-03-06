use crate::dinoparc_client::http::JsHttpDinoparcClient;
use crate::dinoparc_client::mem::JsMemDinoparcClient;
use crate::neon_helpers::{resolve_callback_serde, NeonNamespace};
use etwin_core::dinoparc::{
  DinoparcClient, DinoparcCredentials, DinoparcDinozId, DinoparcServer, DinoparcSession, DinoparcSessionKey,
  DinoparcUserId,
};
use neon::prelude::*;
use std::sync::Arc;

pub fn create_namespace<'a, C: Context<'a>>(cx: &mut C) -> JsResult<'a, JsObject> {
  let ns = cx.empty_object();
  ns.set_with(cx, "http", http::create_namespace)?;
  ns.set_with(cx, "mem", mem::create_namespace)?;
  ns.set_function(cx, "getPreferredExchangeWith", get_preferred_exchange_with)?;
  ns.set_function(cx, "createSession", create_session)?;
  ns.set_function(cx, "testSession", test_session)?;
  ns.set_function(cx, "getExchangeWith", get_exchange_with)?;
  ns.set_function(cx, "getDinoz", get_dinoz)?;
  ns.set_function(cx, "getInventory", get_inventory)?;
  ns.set_function(cx, "getCollection", get_collection)?;
  Ok(ns)
}

pub fn get_native_dinoparc_client<'a, C: Context<'a>>(
  cx: &mut C,
  value: Handle<JsValue>,
) -> NeonResult<Arc<dyn DinoparcClient>> {
  match value.downcast::<JsMemDinoparcClient, _>(cx) {
    Ok(val) => {
      let val = Arc::clone(&**val);
      Ok(val)
    }
    Err(_) => match value.downcast::<JsHttpDinoparcClient, _>(cx) {
      Ok(val) => {
        let val = Arc::clone(&**val);
        Ok(val)
      }
      Err(_) => {
        cx.throw_type_error::<_, Arc<dyn DinoparcClient>>("JsMemDinoparcClient | JsHttpDinoparcClient".to_string())
      }
    },
  }
}

pub fn get_preferred_exchange_with(mut cx: FunctionContext) -> JsResult<JsUndefined> {
  let inner = cx.argument::<JsValue>(0)?;
  let inner = get_native_dinoparc_client(&mut cx, inner)?;
  let options_json = cx.argument::<JsString>(1)?;
  let cb = cx.argument::<JsFunction>(2)?.root(&mut cx);

  let options: DinoparcServer = serde_json::from_str(&options_json.value(&mut cx)).unwrap();

  let res = async move { Ok(inner.get_preferred_exchange_with(options).await) };
  resolve_callback_serde(&mut cx, res, cb)
}

pub fn create_session(mut cx: FunctionContext) -> JsResult<JsUndefined> {
  let inner = cx.argument::<JsValue>(0)?;
  let inner = get_native_dinoparc_client(&mut cx, inner)?;
  let options_json = cx.argument::<JsString>(1)?;
  let cb = cx.argument::<JsFunction>(2)?.root(&mut cx);

  let options: DinoparcCredentials = serde_json::from_str(&options_json.value(&mut cx)).unwrap();

  let res = async move { inner.create_session(&options).await };
  resolve_callback_serde(&mut cx, res, cb)
}

pub fn test_session(mut cx: FunctionContext) -> JsResult<JsUndefined> {
  let inner = cx.argument::<JsValue>(0)?;
  let inner = get_native_dinoparc_client(&mut cx, inner)?;
  let server_json = cx.argument::<JsString>(1)?;
  let key_json = cx.argument::<JsString>(2)?;
  let cb = cx.argument::<JsFunction>(3)?.root(&mut cx);

  let server: DinoparcServer = serde_json::from_str(&server_json.value(&mut cx)).unwrap();
  let key: DinoparcSessionKey = serde_json::from_str(&key_json.value(&mut cx)).unwrap();

  let res = async move { inner.test_session(server, &key).await };
  resolve_callback_serde(&mut cx, res, cb)
}

pub fn get_exchange_with(mut cx: FunctionContext) -> JsResult<JsUndefined> {
  let inner = cx.argument::<JsValue>(0)?;
  let inner = get_native_dinoparc_client(&mut cx, inner)?;
  let session_json = cx.argument::<JsString>(1)?;
  let recipient_json = cx.argument::<JsString>(2)?;
  let cb = cx.argument::<JsFunction>(3)?.root(&mut cx);

  let session: DinoparcSession = serde_json::from_str(&session_json.value(&mut cx)).unwrap();
  let recipient: DinoparcUserId = serde_json::from_str(&recipient_json.value(&mut cx)).unwrap();

  let res = async move { inner.get_exchange_with(&session, recipient).await };
  resolve_callback_serde(&mut cx, res, cb)
}

pub fn get_dinoz(mut cx: FunctionContext) -> JsResult<JsUndefined> {
  let inner = cx.argument::<JsValue>(0)?;
  let inner = get_native_dinoparc_client(&mut cx, inner)?;
  let session_json = cx.argument::<JsString>(1)?;
  let dinoz_id_json = cx.argument::<JsString>(2)?;
  let cb = cx.argument::<JsFunction>(3)?.root(&mut cx);

  let session: DinoparcSession = serde_json::from_str(&session_json.value(&mut cx)).unwrap();
  let dinoz_id: DinoparcDinozId = serde_json::from_str(&dinoz_id_json.value(&mut cx)).unwrap();

  let res = async move { inner.get_dinoz(&session, dinoz_id).await };
  resolve_callback_serde(&mut cx, res, cb)
}

pub fn get_inventory(mut cx: FunctionContext) -> JsResult<JsUndefined> {
  let inner = cx.argument::<JsValue>(0)?;
  let inner = get_native_dinoparc_client(&mut cx, inner)?;
  let session_json = cx.argument::<JsString>(1)?;
  let cb = cx.argument::<JsFunction>(2)?.root(&mut cx);

  let session: DinoparcSession = serde_json::from_str(&session_json.value(&mut cx)).unwrap();

  let res = async move { inner.get_inventory(&session).await };
  resolve_callback_serde(&mut cx, res, cb)
}

pub fn get_collection(mut cx: FunctionContext) -> JsResult<JsUndefined> {
  let inner = cx.argument::<JsValue>(0)?;
  let inner = get_native_dinoparc_client(&mut cx, inner)?;
  let session_json = cx.argument::<JsString>(1)?;
  let cb = cx.argument::<JsFunction>(2)?.root(&mut cx);

  let session: DinoparcSession = serde_json::from_str(&session_json.value(&mut cx)).unwrap();

  let res = async move { inner.get_collection(&session).await };
  resolve_callback_serde(&mut cx, res, cb)
}

pub mod http {
  use crate::clock::get_native_clock;
  use crate::neon_helpers::NeonNamespace;
  use etwin_core::clock::Clock;
  use etwin_dinoparc_client::http::{HttpDinoparcClient, HttpDinoparcClientEvent};
  use etwin_log::{Logger, NoopLogger};
  use neon::prelude::*;
  use std::sync::Arc;

  pub fn create_namespace<'a, C: Context<'a>>(cx: &mut C) -> JsResult<'a, JsObject> {
    let ns = cx.empty_object();
    ns.set_function(cx, "new", new)?;
    Ok(ns)
  }

  pub type JsHttpDinoparcClient =
    JsBox<Arc<HttpDinoparcClient<Arc<dyn Clock>, Arc<dyn for<'r> Logger<HttpDinoparcClientEvent<'r, &'r [u8]>>>>>>;

  pub fn new(mut cx: FunctionContext) -> JsResult<JsHttpDinoparcClient> {
    let clock = cx.argument::<JsValue>(0)?;
    let clock: Arc<dyn Clock> = get_native_clock(&mut cx, clock)?;
    let logger: Arc<dyn for<'r> Logger<HttpDinoparcClientEvent<'r, &'r [u8]>>> = Arc::new(NoopLogger);
    #[allow(clippy::type_complexity)]
    let inner: Arc<
      HttpDinoparcClient<Arc<dyn Clock>, Arc<dyn for<'r> Logger<HttpDinoparcClientEvent<'r, &'r [u8]>>>>,
    > = Arc::new(HttpDinoparcClient::new(clock, logger).unwrap());
    Ok(cx.boxed(inner))
  }
}

pub mod mem {
  use crate::clock::get_native_clock;
  use crate::neon_helpers::NeonNamespace;
  use etwin_core::clock::Clock;
  use etwin_core::dinoparc::{DinoparcPassword, DinoparcServer, DinoparcUserId, DinoparcUsername};
  use etwin_dinoparc_client::mem::MemDinoparcClient;
  use neon::prelude::*;
  use std::sync::Arc;

  pub fn create_namespace<'a, C: Context<'a>>(cx: &mut C) -> JsResult<'a, JsObject> {
    let ns = cx.empty_object();
    ns.set_function(cx, "new", new)?;
    ns.set_function(cx, "createUser", create_user)?;
    Ok(ns)
  }

  pub type JsMemDinoparcClient = JsBox<Arc<MemDinoparcClient<Arc<dyn Clock>>>>;

  pub fn new(mut cx: FunctionContext) -> JsResult<JsMemDinoparcClient> {
    let clock = cx.argument::<JsValue>(0)?;
    let clock: Arc<dyn Clock> = get_native_clock(&mut cx, clock)?;
    let inner: Arc<MemDinoparcClient<Arc<dyn Clock>>> = Arc::new(MemDinoparcClient::new(clock));
    Ok(cx.boxed(inner))
  }

  pub fn create_user(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let inner = cx.argument::<JsMemDinoparcClient>(0)?;
    let inner = Arc::clone(&inner);
    let server_json = cx.argument::<JsString>(1)?;
    let user_id_json = cx.argument::<JsString>(2)?;
    let username_json = cx.argument::<JsString>(3)?;
    let password_json = cx.argument::<JsString>(4)?;

    let server: DinoparcServer = serde_json::from_str(&server_json.value(&mut cx)).unwrap();
    let user_id: DinoparcUserId = serde_json::from_str(&user_id_json.value(&mut cx)).unwrap();
    let username: DinoparcUsername = serde_json::from_str(&username_json.value(&mut cx)).unwrap();
    let password: DinoparcPassword = serde_json::from_str(&password_json.value(&mut cx)).unwrap();

    inner.create_user(server, user_id, username, password);
    Ok(cx.undefined())
  }
}
