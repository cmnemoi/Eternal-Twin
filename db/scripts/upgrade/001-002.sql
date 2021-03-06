ALTER TABLE users
  ADD CONSTRAINT username__uniq UNIQUE (username);

-- OAuth clients
CREATE TABLE public.oauth_clients (
  -- OAuth client id
  oauth_client_id UUID PRIMARY KEY NOT NULL,
  -- The key is a small string serving as a secondary identifier for system clients
  -- Its goal is to provide an easier way to identify the app: while the `oauth_client_id` is generated by the server,
  -- the `key` is defined by the client (and can be known before the registration of the client).
  key VARCHAR(32) NULL,
  -- OAuth client creation time
  ctime TIMESTAMP(0),
  -- Display name for the OAuth client
  display_name VARCHAR(64) NOT NULL,
  -- Time of the last change to `display_name`
  display_name_mtime TIMESTAMP(0) NOT NULL,
  -- URI to the homepage of the app
  app_uri VARCHAR(512) NOT NULL,
  -- Time of the last change to `app_uri`
  app_uri_mtime TIMESTAMP(0) NOT NULL,
  -- Redirection URI (matched exactly against `redirect_uri` during the OAuth flow)
  callback_uri VARCHAR(512) NOT NULL,
  -- Time of the last change to `callback_uri_mtime`
  callback_uri_mtime TIMESTAMP(0) NOT NULL,
  -- Encrypted password hash (hashed with `scrypt`, encrypted with `pgp_sym_encrypt_bytea`)
  secret BYTEA NOT NULL,
  -- Time of the last change to `password`
  secret_mtime TIMESTAMP(0) NOT NULL,
  -- ID of the user owning this client. `null` indicates that it is a pre-defined client owned by the system.
  owner_id UUID NULL,
  CHECK (display_name_mtime >= ctime),
  CHECK (app_uri_mtime >= ctime),
  CHECK (callback_uri_mtime >= ctime),
  CHECK (secret_mtime >= ctime),
  -- System apps have a key and no owner, third-party apps have an owner but no key
  CHECK ((key IS NULL) <> (owner_id IS NULL)),
  UNIQUE (key)
);

CREATE TABLE public.old_oauth_client_display_names (
  -- Oauth client ID
  oauth_client_id UUID NOT NULL,
  -- Time when this was value was initially set.
  start_time TIMESTAMP(0),
  display_name VARCHAR(64) NOT NULL,
  PRIMARY KEY (oauth_client_id, start_time),
  CONSTRAINT old_oauth_client_display_name__oauth_client__fk FOREIGN KEY (oauth_client_id) REFERENCES oauth_clients(oauth_client_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE public.old_oauth_client_app_uris (
  -- Oauth client ID
  oauth_client_id UUID NOT NULL,
  start_time TIMESTAMP(0),
  app_uri VARCHAR(512) NOT NULL,
  PRIMARY KEY (oauth_client_id, start_time),
  CONSTRAINT old_oauth_client_app_uri__oauth_client__fk FOREIGN KEY (oauth_client_id) REFERENCES oauth_clients(oauth_client_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE public.old_oauth_client_callback_uris (
  oauth_client_id UUID NOT NULL,
  start_time TIMESTAMP(0),
  callback_uri VARCHAR(512) NOT NULL,
  PRIMARY KEY (oauth_client_id, start_time),
  CONSTRAINT old_oauth_client_callback_uri__oauth_client__fk FOREIGN KEY (oauth_client_id) REFERENCES oauth_clients(oauth_client_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE public.old_oauth_client_secrets (
  oauth_client_id UUID NOT NULL,
  start_time TIMESTAMP(0),
  secret BYTEA NOT NULL,
  PRIMARY KEY (oauth_client_id, start_time),
  CONSTRAINT old_oauth_client_secret__oauth_client__fk FOREIGN KEY (oauth_client_id) REFERENCES oauth_clients(oauth_client_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Oauth Access token grant access to one user's data for one client app.
CREATE TABLE public.oauth_access_tokens (
  oauth_access_token_id UUID PRIMARY KEY NOT NULL,
  -- OAuth client app id
  oauth_client_id UUID NOT NULL,
  -- Id for the corresponding user
  user_id UUID NOT NULL,
  -- Token creation time
  ctime TIMESTAMP(0) NOT NULL,
  -- Token use time
  atime TIMESTAMP(0) NOT NULL,
  -- TODO: Add encrypted part so DB dumps don't provide full access to tokens
  -- Encrypted password hash (hashed with `scrypt`, encrypted with `pgp_sym_encrypt_bytea`)
  -- secret BYTEA NOT NULL,
  CHECK (atime >= ctime),
  CONSTRAINT oauth_access_token__oauth_client__fk FOREIGN KEY (oauth_client_id) REFERENCES oauth_clients(oauth_client_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT oauth_access_token__user__fk FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);
