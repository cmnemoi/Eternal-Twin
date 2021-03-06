import { AuthService, DefaultAuthService } from "@eternal-twin/core/lib/auth/service";
import { Session } from "@eternal-twin/core/lib/auth/session";
import { SessionId } from "@eternal-twin/core/lib/auth/session-id";
import { AuthStore } from "@eternal-twin/core/lib/auth/store";
import { ObjectType } from "@eternal-twin/core/lib/core/object-type";
import { UuidGenerator } from "@eternal-twin/core/lib/core/uuid-generator";
import { DinoparcClient } from "@eternal-twin/core/lib/dinoparc/client";
import { DinoparcStore } from "@eternal-twin/core/lib/dinoparc/store";
import { EmailAddress } from "@eternal-twin/core/lib/email/email-address";
import { EmailService } from "@eternal-twin/core/lib/email/service";
import { EmailTemplateService } from "@eternal-twin/core/lib/email-template/service";
import { HammerfestClient } from "@eternal-twin/core/lib/hammerfest/client";
import { HammerfestStore } from "@eternal-twin/core/lib/hammerfest/store";
import { LinkService } from "@eternal-twin/core/lib/link/service";
import { OauthProviderService } from "@eternal-twin/core/lib/oauth/provider-service";
import { PasswordService } from "@eternal-twin/core/lib/password/service";
import { TwinoidClient } from "@eternal-twin/core/lib/twinoid/client";
import { TwinoidStore } from "@eternal-twin/core/lib/twinoid/store";
import { DEFAULT_USER_FIELDS } from "@eternal-twin/core/lib/user/default-user-fields";
import { SimpleUser } from "@eternal-twin/core/lib/user/simple-user";
import { UserStore } from "@eternal-twin/core/lib/user/store";
import { UserId } from "@eternal-twin/core/lib/user/user-id";
import { UuidHex } from "kryo/uuid-hex";

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
  twinoidClient: TwinoidClient,
  uuidGenerator: UuidGenerator,
}

export class InMemoryAuthService extends DefaultAuthService implements AuthService {
  /**
   * Creates a new authentication service.
   */
  constructor(options: Readonly<InMemoryAuthServiceOptions>) {
    super({
      authStore: new MemAuthStore({
        userStore: options.userStore,
        uuidGenerator: options.uuidGenerator,
      }),
      dinoparcStore: options.dinoparcStore,
      dinoparcClient: options.dinoparcClient,
      email: options.email,
      emailTemplate: options.emailTemplate,
      hammerfestStore: options.hammerfestStore,
      hammerfestClient: options.hammerfestClient,
      link: options.link,
      oauthProvider: options.oauthProvider,
      password: options.password,
      userStore: options.userStore,
      tokenSecret: options.tokenSecret,
      twinoidStore: options.twinoidStore,
      twinoidClient: options.twinoidClient,
      uuidGenerator: options.uuidGenerator,
    });
  }
}

interface MemAuthStoreOptions {
  userStore: UserStore;
  uuidGenerator: UuidGenerator;
}

interface EmailVerification {
  userId: UserId;
  emailAddress: EmailAddress;
  ctime: Date;
  validationTime: Date;
}

class MemAuthStore implements AuthStore {
  readonly #userStore: UserStore;
  readonly #uuidGenerator: UuidGenerator;

  readonly #emailVerifications: Set<EmailVerification>;
  readonly #sessions: Map<SessionId, Session>;

  public constructor(options: Readonly<MemAuthStoreOptions>) {
    this.#userStore = options.userStore;
    this.#uuidGenerator = options.uuidGenerator;
    this.#emailVerifications = new Set();
    this.#sessions = new Map();
  }

  async createSession(userId: UserId): Promise<Session> {
    const user: SimpleUser | null = await this.#userStore.getUser({ref: {id: userId}, fields: DEFAULT_USER_FIELDS});
    if (user === null) {
      throw new Error("UserNotFound");
    }

    const sessionId: UuidHex = this.#uuidGenerator.next();
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

  async getAndTouchSession(sessionId: SessionId): Promise<Session | null> {
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

  async createValidatedEmailVerification(
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
}
