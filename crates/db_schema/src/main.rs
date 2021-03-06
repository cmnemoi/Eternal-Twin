use etwin_db_schema::get_state;
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use sqlx::PgPool;
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
  let config = etwin_config::find_config(std::env::current_dir().unwrap()).unwrap();
  let database: PgPool = PgPoolOptions::new()
    .max_connections(5)
    .connect_with(
      PgConnectOptions::new()
        .host(&config.db.host)
        .port(config.db.port)
        .database(&config.db.name)
        .username(&config.db.admin_user)
        .password(&config.db.admin_password),
    )
    .await
    .unwrap();
  let database = &database;

  let cur_version = get_state(database).await.unwrap();
  println!("Current state: {:?}", cur_version);
  // force_create_latest(database).await.unwrap();
  Ok(())
}
