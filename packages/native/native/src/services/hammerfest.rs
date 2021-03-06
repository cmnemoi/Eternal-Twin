use crate::hammerfest_client::get_native_hammerfest_client;
use crate::hammerfest_store::get_native_hammerfest_store;
use crate::link_store::get_native_link_store;
use crate::neon_helpers::{resolve_callback_serde, resolve_callback_with, NeonNamespace};
use crate::user_store::get_native_user_store;
use etwin_core::auth::AuthContext;
use etwin_core::hammerfest::{GetHammerfestUserOptions, HammerfestClient, HammerfestStore};
use etwin_core::link::LinkStore;
use etwin_core::user::UserStore;
use etwin_services::hammerfest::HammerfestService;
use neon::prelude::*;
use std::sync::Arc;

pub fn create_namespace<'a, C: Context<'a>>(cx: &mut C) -> JsResult<'a, JsObject> {
  let ns = cx.empty_object();
  ns.set_function(cx, "new", new)?;
  ns.set_function(cx, "getUser", get_user)?;
  Ok(ns)
}

pub type JsHammerfestService = JsBox<
  Arc<HammerfestService<Arc<dyn HammerfestClient>, Arc<dyn HammerfestStore>, Arc<dyn LinkStore>, Arc<dyn UserStore>>>,
>;

#[allow(clippy::type_complexity)]
pub fn get_native_hammerfest_service<'a, C: Context<'a>>(
  cx: &mut C,
  value: Handle<JsValue>,
) -> NeonResult<
  Arc<HammerfestService<Arc<dyn HammerfestClient>, Arc<dyn HammerfestStore>, Arc<dyn LinkStore>, Arc<dyn UserStore>>>,
> {
  match value.downcast::<JsHammerfestService, _>(cx) {
    Ok(val) => {
      let val = Arc::clone(&**val);
      Ok(val)
    }
    Err(_) => cx.throw_type_error::<_, Arc<
      HammerfestService<Arc<dyn HammerfestClient>, Arc<dyn HammerfestStore>, Arc<dyn LinkStore>, Arc<dyn UserStore>>,
    >>("JsHammerfestService".to_string()),
  }
}

pub fn new(mut cx: FunctionContext) -> JsResult<JsUndefined> {
  let hammerfest_client = cx.argument::<JsValue>(0)?;
  let hammerfest_store = cx.argument::<JsValue>(1)?;
  let link_store = cx.argument::<JsValue>(2)?;
  let user_store = cx.argument::<JsValue>(3)?;
  let cb = cx.argument::<JsFunction>(4)?.root(&mut cx);

  let hammerfest_client: Arc<dyn HammerfestClient> = get_native_hammerfest_client(&mut cx, hammerfest_client)?;
  let hammerfest_store: Arc<dyn HammerfestStore> = get_native_hammerfest_store(&mut cx, hammerfest_store)?;
  let link_store: Arc<dyn LinkStore> = get_native_link_store(&mut cx, link_store)?;
  let user_store: Arc<dyn UserStore> = get_native_user_store(&mut cx, user_store)?;

  let res = async move {
    Arc::new(HammerfestService::new(
      hammerfest_client,
      hammerfest_store,
      link_store,
      user_store,
    ))
  };

  resolve_callback_with(&mut cx, res, cb, |c: &mut TaskContext, res| Ok(c.boxed(res).upcast()))
}

pub fn get_user(mut cx: FunctionContext) -> JsResult<JsUndefined> {
  let inner = cx.argument::<JsValue>(0)?;
  let inner = get_native_hammerfest_service(&mut cx, inner)?;
  let acx_json = cx.argument::<JsString>(1)?;
  let options_json = cx.argument::<JsString>(2)?;
  let cb = cx.argument::<JsFunction>(3)?.root(&mut cx);

  let acx: AuthContext = serde_json::from_str(&acx_json.value(&mut cx)).unwrap();
  let options: GetHammerfestUserOptions = serde_json::from_str(&options_json.value(&mut cx)).unwrap();

  let res = async move { inner.get_user(&acx, &options).await };
  resolve_callback_serde(&mut cx, res, cb)
}
