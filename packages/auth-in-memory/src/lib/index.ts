import { AuthContext } from "@eternal-twin/core/lib/auth/auth-context.js";
import { AuthScope } from "@eternal-twin/core/lib/auth/auth-scope.js";
import { AuthType } from "@eternal-twin/core/lib/auth/auth-type.js";
import { Credentials } from "@eternal-twin/core/lib/auth/credentials.js";
import {
  dinoparcToUserDisplayName,
  hammerfestToUserDisplayName,
  readLogin,
  twinoidToUserDisplayName
} from "@eternal-twin/core/lib/auth/helpers.js";
import { LoginType } from "@eternal-twin/core/lib/auth/login-type.js";
import { RegisterOrLoginWithEmailOptions } from "@eternal-twin/core/lib/auth/register-or-login-with-email-options.js";
import { RegisterWithUsernameOptions } from "@eternal-twin/core/lib/auth/register-with-username-options.js";
import { RegisterWithVerifiedEmailOptions } from "@eternal-twin/core/lib/auth/register-with-verified-email-options.js";
import { AuthService } from "@eternal-twin/core/lib/auth/service.js";
import { Session } from "@eternal-twin/core/lib/auth/session.js";
import { SessionId } from "@eternal-twin/core/lib/auth/session-id.js";
import { SystemAuthContext } from "@eternal-twin/core/lib/auth/system-auth-context.js";
import { $UserAndSession, UserAndSession } from "@eternal-twin/core/lib/auth/user-and-session.js";
import { UserCredentials } from "@eternal-twin/core/lib/auth/user-credentials.js";
import { $UserLogin, UserLogin } from "@eternal-twin/core/lib/auth/user-login.js";
import { LocaleId } from "@eternal-twin/core/lib/core/locale-id.js";
import { ObjectType } from "@eternal-twin/core/lib/core/object-type.js";
import { UuidGenerator } from "@eternal-twin/core/lib/core/uuid-generator.js";
import { DinoparcClient } from "@eternal-twin/core/lib/dinoparc/client.js";
import { DinoparcCredentials } from "@eternal-twin/core/lib/dinoparc/dinoparc-credentials.js";
import { DinoparcSession } from "@eternal-twin/core/lib/dinoparc/dinoparc-session.js";
import { ShortDinoparcUser } from "@eternal-twin/core/lib/dinoparc/short-dinoparc-user.js";
import { DinoparcStore } from "@eternal-twin/core/lib/dinoparc/store.js";
import { $EmailAddress, EmailAddress } from "@eternal-twin/core/lib/email/email-address.js";
import { EmailService } from "@eternal-twin/core/lib/email/service.js";
import { EmailTemplateService } from "@eternal-twin/core/lib/email-template/service.js";
import { HammerfestClient } from "@eternal-twin/core/lib/hammerfest/client.js";
import { HammerfestCredentials } from "@eternal-twin/core/lib/hammerfest/hammerfest-credentials.js";
import { HammerfestSession } from "@eternal-twin/core/lib/hammerfest/hammerfest-session.js";
import { ShortHammerfestUser } from "@eternal-twin/core/lib/hammerfest/short-hammerfest-user.js";
import { HammerfestStore } from "@eternal-twin/core/lib/hammerfest/store.js";
import { LinkService } from "@eternal-twin/core/lib/link/service.js";
import { VersionedEtwinLink } from "@eternal-twin/core/lib/link/versioned-etwin-link.js";
import { CompleteOauthAccessToken } from "@eternal-twin/core/lib/oauth/complete-oauth-access-token.js";
import { EtwinOauthAccessTokenKey } from "@eternal-twin/core/lib/oauth/etwin-oauth-access-token-key.js";
import { OauthClient } from "@eternal-twin/core/lib/oauth/oauth-client.js";
import { OauthProviderService } from "@eternal-twin/core/lib/oauth/provider-service.js";
import { RfcOauthAccessTokenKey } from "@eternal-twin/core/lib/oauth/rfc-oauth-access-token-key.js";
import { PasswordHash } from "@eternal-twin/core/lib/password/password-hash.js";
import { PasswordService } from "@eternal-twin/core/lib/password/service.js";
import { TwinoidStore } from "@eternal-twin/core/lib/twinoid/store.js";
import { DEFAULT_USER_FIELDS } from "@eternal-twin/core/lib/user/default-user-fields.js";
import { ShortUser } from "@eternal-twin/core/lib/user/short-user.js";
import { SHORT_USER_FIELDS } from "@eternal-twin/core/lib/user/short-user-fields.js";
import { SimpleUser } from "@eternal-twin/core/lib/user/simple-user.js";
import { UserStore } from "@eternal-twin/core/lib/user/store.js";
import { UserDisplayName } from "@eternal-twin/core/lib/user/user-display-name.js";
import { UserId } from "@eternal-twin/core/lib/user/user-id.js";
import { $Username, Username } from "@eternal-twin/core/lib/user/username.js";
import { TwinoidClientService } from "@eternal-twin/twinoid-core/src/lib/client.js";
import { User as TidUser } from "@eternal-twin/twinoid-core/src/lib/user.js";
import jsonWebToken from "jsonwebtoken";
import { UuidHex } from "kryo/lib/uuid-hex.js";
import { JSON_VALUE_READER } from "kryo-json/lib/json-value-reader.js";

import { $EmailRegistrationJwt, EmailRegistrationJwt } from "./email-registration-jwt.js";

interface EmailVerification {
  userId: UserId;
  emailAddress: EmailAddress;
  ctime: Date;
  validationTime: Date;
}

const SYSTEM_AUTH: SystemAuthContext = {
  type: AuthType.System,
  scope: AuthScope.Default,
};

export interface InMemoryAuthServiceOptions {
  dinoparcStore: DinoparcStore;
  dinoparcClient: DinoparcClient;
  email: EmailService,
  emailTemplate: EmailTemplateService,
  hammerfestStore: HammerfestStore,
  hammerfestClient: HammerfestClient,
  link: LinkService,
  oauthProvider: OauthProviderService,
  password: PasswordService,
  userStore: UserStore,
  tokenSecret: Uint8Array,
  twinoidStore: TwinoidStore,
  twinoidClient: TwinoidClientService,
  uuidGenerator: UuidGenerator,
}

export class InMemoryAuthService implements AuthService {
  readonly #dinoparcStore: DinoparcStore;
  readonly #dinoparcClient: DinoparcClient;
  readonly #email: EmailService;
  readonly #emailTemplate: EmailTemplateService;
  readonly #hammerfestStore: HammerfestStore;
  readonly #hammerfestClient: HammerfestClient;
  readonly #link: LinkService;
  readonly #oauthProvider: OauthProviderService;
  readonly #password: PasswordService;
  readonly #userStore: UserStore;
  readonly #tokenSecret: Buffer;
  readonly #twinoidStore: TwinoidStore;
  readonly #twinoidClient: TwinoidClientService;
  readonly #uuidGen: UuidGenerator;

  readonly #defaultLocale: LocaleId;

  readonly #emailVerifications: Set<EmailVerification>;
  readonly #passwordHashes: Map<UserId, PasswordHash>;
  readonly #sessions: Map<SessionId, Session>;

  /**
   * Creates a new authentication service.
   */
  constructor(options: Readonly<InMemoryAuthServiceOptions>) {
    this.#dinoparcStore = options.dinoparcStore;
    this.#dinoparcClient = options.dinoparcClient;
    this.#email = options.email;
    this.#emailTemplate = options.emailTemplate;
    this.#hammerfestStore = options.hammerfestStore;
    this.#hammerfestClient = options.hammerfestClient;
    this.#link = options.link;
    this.#oauthProvider = options.oauthProvider;
    this.#password = options.password;
    this.#userStore = options.userStore;
    this.#tokenSecret = Buffer.from(options.tokenSecret);
    this.#twinoidStore = options.twinoidStore;
    this.#twinoidClient = options.twinoidClient;
    this.#uuidGen = options.uuidGenerator;
    this.#defaultLocale = "en-US";

    this.#emailVerifications = new Set();
    this.#passwordHashes = new Map();
    this.#sessions = new Map();
  }

  /**
   * Sends a registration or login email.
   *
   * @param acx Auth context
   * @param options Options
   */
  async registerOrLoginWithEmail(acx: AuthContext, options: RegisterOrLoginWithEmailOptions): Promise<void> {
    if (acx.type !== AuthType.Guest) {
      throw Error("Forbidden: Only guests can authenticate");
    }
    const token: string = await this.createEmailVerificationToken(options.email);
    const emailLocale: LocaleId = options.locale ?? this.#defaultLocale;
    const emailContent = await this.#emailTemplate.verifyRegistrationEmail(emailLocale, token);
    await this.#email.sendEmail(options.email, emailContent);
  }

  async registerWithVerifiedEmail(
    acx: AuthContext,
    options: RegisterWithVerifiedEmailOptions,
  ): Promise<UserAndSession> {
    if (acx.type !== AuthType.Guest) {
      throw Error("Forbidden: Only guests can register");
    }

    const emailJwt: EmailRegistrationJwt = await this.readEmailVerificationToken(options.emailToken);
    const email: EmailAddress = emailJwt.email;

    const oldUser: ShortUser | null = await this.#userStore.getUser({ref: {email}, fields: SHORT_USER_FIELDS});
    if (oldUser !== null) {
      throw new Error(`Conflict: EmailAddressAlreadyInUse: ${JSON.stringify(oldUser.id)}`);
    }

    const displayName: UserDisplayName = options.displayName;
    const passwordHash: PasswordHash = await this.#password.hash(options.password);
    const user: SimpleUser = await this.#userStore.createUser({displayName, email, username: null});
    this.setPasswordHash(user.id, passwordHash);

    try {
      await this.createValidatedEmailVerification(user.id, email, new Date(emailJwt.issuedAt * 1000));
    } catch (err) {
      console.warn(`FailedToCreateEmailVerification\n${err.stack}`);
    }

    const session: Session = await this.createSession(user.id);

    return $UserAndSession.clone({user, isAdministrator: user.isAdministrator, session});
  }

  async registerWithUsername(acx: AuthContext, options: RegisterWithUsernameOptions): Promise<UserAndSession> {
    if (acx.type !== AuthType.Guest) {
      throw Error("Forbidden: Only guests can register");
    }

    const username: Username = options.username;
    const oldUser: ShortUser | null = await this.#userStore.getUser({ref: {username}, fields: SHORT_USER_FIELDS});
    if (oldUser !== null) {
      throw new Error(`Conflict: UsernameAlreadyInUse: ${JSON.stringify(oldUser.id)}`);
    }

    const displayName: UserDisplayName = options.displayName;
    const passwordHash: PasswordHash = await this.#password.hash(options.password);
    const user: SimpleUser = await this.#userStore.createUser({displayName, email: null, username});
    this.setPasswordHash(user.id, passwordHash);

    const session: Session = await this.createSession(user.id);

    return $UserAndSession.clone({user, isAdministrator: user.isAdministrator, session});
  }

  async loginWithCredentials(acx: AuthContext, credentials: UserCredentials): Promise<UserAndSession> {
    if (acx.type !== AuthType.Guest) {
      throw Error("Forbidden: Only guests can authenticate");
    }
    const login: UserLogin = credentials.login;
    let imUser: ShortUser;
    switch ($UserLogin.match(credentials.login)) {
      case $EmailAddress: {
        const maybeImUser: ShortUser | null = await this.#userStore.getUser({ref: {email: login}, fields: SHORT_USER_FIELDS});
        if (maybeImUser === null) {
          throw new Error(`UserNotFound: User not found for the email: ${login}`);
        }
        imUser = maybeImUser;
        break;
      }
      case $Username: {
        const maybeImUser: ShortUser | null = await this.#userStore.getUser({ref: {username: login}, fields: SHORT_USER_FIELDS});
        if (maybeImUser === null) {
          throw new Error(`UserNotFound: User not found for the username: ${login}`);
        }
        imUser = maybeImUser;
        break;
      }
      default:
        throw new Error("AssertionError: Invalid `credentials.login` type");
    }
    const passwordHash: PasswordHash | null = this.getPasswordHash(imUser.id);
    if (passwordHash === null) {
      throw new Error("NoPassword: Password authentication is not available for this user");
    }

    const isMatch: boolean = await this.#password.verify(passwordHash, credentials.password);

    if (!isMatch) {
      throw new Error("InvalidPassword");
    }

    const session: Session = await this.createSession(imUser.id);
    const user: SimpleUser = await this.getExistingUserById(imUser.id);

    return $UserAndSession.clone({user, isAdministrator: user.isAdministrator, session});
  }

  async registerOrLoginWithDinoparc(
    acx: AuthContext,
    credentials: DinoparcCredentials,
  ): Promise<UserAndSession> {
    if (acx.type !== AuthType.Guest) {
      throw Error("Forbidden: Only guests can authenticate");
    }
    const dparcSession: DinoparcSession = await this.#dinoparcClient.createSession(credentials);
    const dparcUser: ShortDinoparcUser = dparcSession.user;
    await this.#dinoparcStore.touchShortUser(dparcUser);

    const link: VersionedEtwinLink = await this.#link.getLinkFromDinoparc(dparcUser.server, dparcUser.id);

    let userId: UserId;
    if (link.current !== null) {
      userId = link.current.user.id;
    } else {
      const displayName = dinoparcToUserDisplayName(dparcSession.user);
      const user = await this.#userStore.createUser({displayName, email: null, username: null});
      await this.#link.linkToDinoparc({userId: user.id, dinoparcServer: dparcUser.server, dinoparcUserId: dparcUser.id, linkedBy: user.id});
      userId = user.id;
    }

    const session: Session = await this.createSession(userId);
    const user = await this.getExistingUserById(session.user.id);

    return $UserAndSession.clone({user, isAdministrator: user.isAdministrator, session});
  }

  async registerOrLoginWithHammerfest(
    acx: AuthContext,
    credentials: HammerfestCredentials,
  ): Promise<UserAndSession> {
    if (acx.type !== AuthType.Guest) {
      throw Error("Forbidden: Only guests can authenticate");
    }
    const hfSession: HammerfestSession = await this.#hammerfestClient.createSession(credentials);
    const hfUser: ShortHammerfestUser = hfSession.user;
    await this.#hammerfestStore.touchShortUser(hfUser);

    const link: VersionedEtwinLink = await this.#link.getLinkFromHammerfest(hfUser.server, hfUser.id);

    let userId: UserId;
    if (link.current !== null) {
      userId = link.current.user.id;
    } else {
      const displayName = hammerfestToUserDisplayName(hfSession.user);
      const user = await this.#userStore.createUser({displayName, email: null, username: null});
      await this.#link.linkToHammerfest({userId: user.id, hammerfestServer: hfUser.server, hammerfestUserId: hfUser.id, linkedBy: user.id});
      userId = user.id;
    }

    const session: Session = await this.createSession(userId);
    const user = await this.getExistingUserById(session.user.id);

    return $UserAndSession.clone({user, isAdministrator: user.isAdministrator, session});
  }

  async registerOrLoginWithTwinoidOauth(acx: AuthContext, at: RfcOauthAccessTokenKey): Promise<UserAndSession> {
    if (acx.type !== AuthType.Guest) {
      throw Error("Forbidden: Only guests can authenticate");
    }
    const tidUser: Partial<TidUser> = await this.#twinoidClient.getMe(at);
    await this.#twinoidStore.touchShortUser({type: ObjectType.TwinoidUser, id: tidUser.id!.toString(10), displayName: tidUser.name!});

    const link: VersionedEtwinLink = await this.#link.getLinkFromTwinoid(tidUser.id!.toString(10));

    let userId: UserId;
    if (link.current !== null) {
      userId = link.current.user.id;
    } else {
      const displayName = twinoidToUserDisplayName(tidUser as Readonly<Pick<TidUser, "id" | "name">>);
      const user = await this.#userStore.createUser({displayName, email: null, username: null});
      await this.#link.linkToTwinoid({userId: user.id, twinoidUserId: tidUser.id!.toString(10), linkedBy: user.id});
      userId = user.id;
    }

    const session: Session = await this.createSession(userId);
    const user = await this.getExistingUserById(session.user.id);

    return {user, isAdministrator: user.isAdministrator, session};
  }

  async authenticateSession(acx: AuthContext, sessionId: string): Promise<UserAndSession | null> {
    if (acx.type !== AuthType.Guest) {
      throw Error("Forbidden: Only guests can register");
    }
    const session: Session | null = await this.getAndTouchSession(sessionId);
    if (session === null) {
      return null;
    }

    const user: SimpleUser = await this.getExistingUserById(session.user.id);

    return $UserAndSession.clone({user, isAdministrator: user.isAdministrator, session});
  }

  public async authenticateAccessToken(tokenKey: EtwinOauthAccessTokenKey): Promise<AuthContext> {
    const token: CompleteOauthAccessToken | null = await this.#oauthProvider.getAccessTokenByKey(SYSTEM_AUTH, tokenKey);
    if (token === null) {
      throw new Error("NotFound");
    }
    return {
      type: AuthType.AccessToken,
      scope: AuthScope.Default,
      client: token.client,
      user: token.user,
    };
  }

  public async authenticateCredentials(credentials: Credentials): Promise<AuthContext> {
    const login = readLogin(credentials.login);
    switch (login.type) {
      case LoginType.OauthClientKey: {
        const client: OauthClient | null = await this.#oauthProvider.getClientByIdOrKey(SYSTEM_AUTH, login.value);
        if (client === null) {
          throw new Error(`OauthClientNotFound: Client not found for the id or key: ${credentials.login}`);
        }
        return this.innerAuthenticateClientCredentials(client, credentials.password);
      }
      case LoginType.Uuid: {
        const [client, user] = await Promise.all([
          this.#oauthProvider.getClientByIdOrKey(SYSTEM_AUTH, login.value),
          this.#userStore.getUser({ref: {id: login.value}, fields: SHORT_USER_FIELDS}),
        ]);
        if (client !== null) {
          if (user !== null) {
            throw new Error("AssertionError: Expected only `client` to be non-null");
          }
          return this.innerAuthenticateClientCredentials(client, credentials.password);
        } else if (user !== null) {
          throw new Error("NotImplemented");
        } else {
          throw new Error(`NotFound: no client or user for the id ${login.value}`);
        }
      }
      default: {
        throw new Error("NotImplemented");
      }
    }
  }

  private async innerAuthenticateClientCredentials(client: OauthClient, password: Uint8Array): Promise<AuthContext> {
    const isMatch: boolean = await this.#oauthProvider.verifyClientSecret(SYSTEM_AUTH, client.id, password);

    if (!isMatch) {
      throw new Error("InvalidSecret");
    }

    return {
      type: AuthType.OauthClient,
      scope: AuthScope.Default,
      client: {
        type: ObjectType.OauthClient,
        id: client.id,
        key: client.key,
        displayName: client.displayName,
      },
    };
  }

  private async getAndTouchSession(sessionId: SessionId): Promise<Session | null> {
    const session: Session | undefined = this.#sessions.get(sessionId);
    if (session === undefined) {
      return null;
    }

    session.atime = new Date();

    return {
      ...session,
      user: {...session.user},
    };
  }
  private async createValidatedEmailVerification(
    userId: UserId,
    email: EmailAddress,
    ctime: Date,
  ): Promise<void> {
    const emailVerification: EmailVerification = {
      userId,
      emailAddress: email,
      ctime,
      validationTime: new Date(),
    };

    this.#emailVerifications.add(emailVerification);
  }

  private async createSession(userId: UserId): Promise<Session> {
    const user: SimpleUser | null = await this.#userStore.getUser({ref: {id: userId}, fields: DEFAULT_USER_FIELDS});
    if (user === null) {
      throw new Error("UserNotFound");
    }

    const sessionId: UuidHex = this.#uuidGen.next();
    const time: number = Date.now();
    const session: Session = {
      id: sessionId,
      ctime: new Date(time),
      atime: new Date(time),
      user: {type: ObjectType.User, id: userId, displayName: user.displayName}
    };

    this.#sessions.set(session.id, session);
    return session;
  }

  private async getExistingUserById(userId: UserId): Promise<SimpleUser> {
    const user: SimpleUser | null = await this.#userStore.getUser({ref: {id: userId}, fields: DEFAULT_USER_FIELDS});

    if (user === null) {
      throw new Error(`AssertionError: Expected user to exist for id ${userId}`);
    }

    return {
      type: ObjectType.User,
      id: user.id,
      createdAt: user.createdAt,
      displayName: user.displayName,
      isAdministrator: user.isAdministrator,
    };
  }

  private async createEmailVerificationToken(emailAddress: EmailAddress): Promise<string> {
    const payload: Omit<EmailRegistrationJwt, "issuedAt" | "expirationTime"> = {
      email: emailAddress,
    };

    return jsonWebToken.sign(
      payload,
      this.#tokenSecret,
      {
        algorithm: "HS256",
        expiresIn: "1d",
      },
    );
  }

  private async readEmailVerificationToken(token: string): Promise<EmailRegistrationJwt> {
    const tokenObj: object | string = jsonWebToken.verify(
      token,
      this.#tokenSecret,
    );
    if (typeof tokenObj !== "object" || tokenObj === null) {
      throw new Error("AssertionError: Expected JWT verification result to be an object");
    }
    return $EmailRegistrationJwt.read(JSON_VALUE_READER, tokenObj);
  }

  private setPasswordHash(userId: UserId, passwordHash: PasswordHash): void {
    this.#passwordHashes.set(userId, passwordHash);
  }

  private getPasswordHash(userId: UserId): PasswordHash | null {
    return this.#passwordHashes.get(userId) ?? null;
  }

  public async hasPassword(userId: UserId): Promise<boolean> {
    return this.#passwordHashes.has(userId);
  }
}
