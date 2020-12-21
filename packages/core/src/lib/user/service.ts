import { TwinoidClientService } from "@eternal-twin/twinoid-core/lib/client.js";
import { User as TidUser } from "@eternal-twin/twinoid-core/lib/user.js";

import { AuthContext } from "../auth/auth-context.js";
import { AuthType } from "../auth/auth-type.js";
import { AuthService } from "../auth/service.js";
import { ObjectType } from "../core/object-type.js";
import { DinoparcClient } from "../dinoparc/client.js";
import { DinoparcStore } from "../dinoparc/store.js";
import { HammerfestClient } from "../hammerfest/client.js";
import { HammerfestStore } from "../hammerfest/store.js";
import { LinkService } from "../link/service.js";
import { VersionedDinoparcLink } from "../link/versioned-dinoparc-link.js";
import { VersionedHammerfestLink } from "../link/versioned-hammerfest-link.js";
import { VersionedTwinoidLink } from "../link/versioned-twinoid-link";
import { TokenService } from "../token/service.js";
import { TwinoidStore } from "../twinoid/store.js";
import { CompleteIfSelfUserFields } from "./complete-if-self-user-fields.js";
import { COMPLETE_USER_FIELDS, CompleteUserFields } from "./complete-user-fields.js";
import { DEFAULT_USER_FIELDS, DefaultUserFields } from "./default-user-fields.js";
import { GetUserByIdOptions } from "./get-user-by-id-options.js";
import { LinkToDinoparcMethod } from "./link-to-dinoparc-method.js";
import { LinkToDinoparcOptions } from "./link-to-dinoparc-options.js";
import { LinkToDinoparcWithCredentialsOptions } from "./link-to-dinoparc-with-credentials-options.js";
import { LinkToDinoparcWithRefOptions } from "./link-to-dinoparc-with-ref-options.js";
import { LinkToHammerfestMethod } from "./link-to-hammerfest-method.js";
import { LinkToHammerfestOptions } from "./link-to-hammerfest-options.js";
import { LinkToHammerfestWithCredentialsOptions } from "./link-to-hammerfest-with-credentials-options.js";
import { LinkToHammerfestWithRefOptions } from "./link-to-hammerfest-with-ref-options.js";
import { LinkToHammerfestWithSessionKeyOptions } from "./link-to-hammerfest-with-session-key-options.js";
import { LinkToTwinoidWithOauthOptions } from "./link-to-twinoid-with-oauth-options.js";
import { LinkToTwinoidWithRefOptions } from "./link-to-twinoid-with-ref-options.js";
import { MaybeCompleteSimpleUser } from "./maybe-complete-simple-user.js";
import { MaybeCompleteUser } from "./maybe-complete-user.js";
import { UserStore } from "./store.js";
import { User } from "./user.js";
import { UserFieldsType } from "./user-fields-type.js";

export interface UserServiceOptions {
  auth: AuthService;
  dinoparcClient: DinoparcClient;
  dinoparcStore: DinoparcStore;
  hammerfestClient: HammerfestClient;
  hammerfestStore: HammerfestStore;
  link: LinkService;
  userStore: UserStore;
  token: TokenService;
  twinoidClient: TwinoidClientService;
  twinoidStore: TwinoidStore;
}

export class UserService {
  readonly #auth: AuthService;
  readonly #dinoparcClient: DinoparcClient;
  readonly #dinoparcStore: DinoparcStore;
  readonly #hammerfestClient: HammerfestClient;
  readonly #hammerfestStore: HammerfestStore;
  readonly #link: LinkService;
  readonly #userStore: UserStore;
  readonly #token: TokenService;
  readonly #twinoidClient: TwinoidClientService;
  readonly #twinoidStore: TwinoidStore;

  public constructor(options: Readonly<UserServiceOptions>) {
    this.#auth = options.auth;
    this.#dinoparcClient = options.dinoparcClient;
    this.#dinoparcStore = options.dinoparcStore;
    this.#hammerfestClient = options.hammerfestClient;
    this.#hammerfestStore = options.hammerfestStore;
    this.#link = options.link;
    this.#userStore = options.userStore;
    this.#token = options.token;
    this.#twinoidClient = options.twinoidClient;
    this.#twinoidStore = options.twinoidStore;
  }

  async getUserById(acx: AuthContext, options: Readonly<GetUserByIdOptions>): Promise<MaybeCompleteUser | null> {
    let userFields: DefaultUserFields | CompleteUserFields | CompleteIfSelfUserFields = DEFAULT_USER_FIELDS;
    if (acx.type === AuthType.User) {
      if (acx.isAdministrator) {
        userFields = COMPLETE_USER_FIELDS;
      } else {
        userFields = {type: UserFieldsType.CompleteIfSelf, selfUserId: acx.user.id};
      }
    }
    const simpleUser: MaybeCompleteSimpleUser | null = await this.#userStore.getUser({
      ref: {id: options.id},
      time: options.time,
      fields: userFields,
    });
    if (simpleUser === null) {
      return null;
    }
    const links = await this.#link.getVersionedLinks(simpleUser.id);
    const user: User = {...simpleUser, links};
    if (acx.type !== AuthType.User || (!acx.isAdministrator && user.id !== acx.user.id)) {
      return user;
    }
    const hasPassword = await this.#auth.hasPassword(simpleUser.id);
    return {...user, hasPassword, links};
  }

  async linkToDinoparc(acx: AuthContext, options: Readonly<LinkToDinoparcOptions>): Promise<VersionedDinoparcLink> {
    switch (options.method) {
      case LinkToDinoparcMethod.Credentials:
        return this.linkToDinoparcWithCredentials(acx, options);
      case LinkToDinoparcMethod.Ref:
        return this.linkToDinoparcWithRef(acx, options);
      default:
        throw new Error("AssertionError: Unexpected `LinkToHammerfestMethod`");
    }
  }

  async linkToDinoparcWithCredentials(acx: AuthContext, options: Readonly<LinkToDinoparcWithCredentialsOptions>): Promise<VersionedDinoparcLink> {
    if (acx.type !== AuthType.User) {
      throw new Error(acx.type === AuthType.Guest ? "Unauthorized" : "Forbidden");
    }
    if (acx.user.id !== options.userId) {
      throw new Error("Forbidden");
    }
    const dparcSession = await this.#dinoparcClient.createSession({
      server: options.dinoparcServer,
      username: options.dinoparcUsername,
      password: options.dinoparcPassword,
    });
    await this.#dinoparcStore.touchShortUser(dparcSession.user);
    await this.#token.touchDinoparc(dparcSession.user.server, dparcSession.key, dparcSession.user.id);
    return await this.#link.linkToDinoparc({
      userId: acx.user.id,
      dinoparcServer: dparcSession.user.server,
      dinoparcUserId: dparcSession.user.id,
      linkedBy: acx.user.id,
    });
  }

  async linkToDinoparcWithRef(acx: AuthContext, options: Readonly<LinkToDinoparcWithRefOptions>): Promise<VersionedDinoparcLink> {
    if (acx.type !== AuthType.User) {
      throw new Error(acx.type === AuthType.Guest ? "Unauthorized" : "Forbidden");
    }
    if (!acx.isAdministrator) {
      throw new Error("Forbidden");
    }
    return await this.#link.linkToDinoparc({
      userId: options.userId,
      dinoparcServer: options.dinoparcServer,
      dinoparcUserId: options.dinoparcUserId,
      linkedBy: acx.user.id,
    });
  }

  async linkToHammerfest(acx: AuthContext, options: Readonly<LinkToHammerfestOptions>): Promise<VersionedHammerfestLink> {
    switch (options.method) {
      case LinkToHammerfestMethod.Credentials:
        return this.linkToHammerfestWithCredentials(acx, options);
      case LinkToHammerfestMethod.SessionKey:
        return this.linkToHammerfestWithSessionKey(acx, options);
      case LinkToHammerfestMethod.Ref:
        return this.linkToHammerfestWithRef(acx, options);
      default:
        throw new Error("AssertionError: Unexpected `LinkToHammerfestMethod`");
    }
  }

  async linkToHammerfestWithCredentials(acx: AuthContext, options: Readonly<LinkToHammerfestWithCredentialsOptions>): Promise<VersionedHammerfestLink> {
    if (acx.type !== AuthType.User) {
      throw new Error(acx.type === AuthType.Guest ? "Unauthorized" : "Forbidden");
    }
    if (acx.user.id !== options.userId) {
      throw new Error("Forbidden");
    }
    const hfSession = await this.#hammerfestClient.createSession({
      server: options.hammerfestServer,
      username: options.hammerfestUsername,
      password: options.hammerfestPassword,
    });
    await this.#hammerfestStore.touchShortUser(hfSession.user);
    await this.#token.touchHammerfest(hfSession.user.server, hfSession.key, hfSession.user.id);
    return await this.#link.linkToHammerfest({
      userId: acx.user.id,
      hammerfestServer: hfSession.user.server,
      hammerfestUserId: hfSession.user.id,
      linkedBy: acx.user.id,
    });
  }

  async linkToHammerfestWithSessionKey(acx: AuthContext, options: Readonly<LinkToHammerfestWithSessionKeyOptions>): Promise<VersionedHammerfestLink> {
    if (acx.type !== AuthType.User) {
      throw new Error(acx.type === AuthType.Guest ? "Unauthorized" : "Forbidden");
    }
    if (acx.user.id !== options.userId) {
      throw new Error("Forbidden");
    }
    const hfSession = await this.#hammerfestClient.testSession(options.hammerfestServer, options.hammerfestSessionKey);
    if (hfSession === null) {
      await this.#token.revokeHammerfest(options.hammerfestServer, options.hammerfestSessionKey);
      throw new Error("InvalidHammerfestSession");
    }
    await this.#hammerfestStore.touchShortUser(hfSession.user);
    await this.#token.touchHammerfest(hfSession.user.server, hfSession.key, hfSession.user.id);
    return await this.#link.linkToHammerfest({
      userId: acx.user.id,
      hammerfestServer: hfSession.user.server,
      hammerfestUserId: hfSession.user.id,
      linkedBy: acx.user.id,
    });
  }

  async linkToHammerfestWithRef(acx: AuthContext, options: Readonly<LinkToHammerfestWithRefOptions>): Promise<VersionedHammerfestLink> {
    if (acx.type !== AuthType.User) {
      throw new Error(acx.type === AuthType.Guest ? "Unauthorized" : "Forbidden");
    }
    if (!acx.isAdministrator) {
      throw new Error("Forbidden");
    }
    const hfProfile = await this.#hammerfestClient.getProfileById(null, {server: options.hammerfestServer, userId: options.userId});
    if (hfProfile === null) {
      throw new Error("InvalidHammerfestRef");
    }
    await this.#hammerfestStore.touchShortUser(hfProfile.user);
    return await this.#link.linkToHammerfest({
      userId: options.userId,
      hammerfestServer: hfProfile.user.server,
      hammerfestUserId: hfProfile.user.id,
      linkedBy: acx.user.id,
    });
  }

  async linkToTwinoidWithOauth(acx: AuthContext, options: Readonly<LinkToTwinoidWithOauthOptions>): Promise<VersionedTwinoidLink> {
    if (acx.type !== AuthType.User) {
      throw new Error(acx.type === AuthType.Guest ? "Unauthorized" : "Forbidden");
    }
    if (acx.user.id !== options.userId) {
      throw new Error("Forbidden");
    }

    const tidUser: Pick<TidUser, "id" | "name"> = await this.#twinoidClient.getMe(options.accessToken.accessToken);
    await this.#twinoidStore.touchShortUser({type: ObjectType.TwinoidUser, id: tidUser.id.toString(10), displayName: tidUser.name});
    await this.#token.touchTwinoidOauth({
      accessToken: options.accessToken.accessToken,
      expirationTime: new Date(Date.now() + options.accessToken.expiresIn * 1000),
      refreshToken: options.accessToken.refreshToken,
      twinoidUserId: tidUser.id.toString(10),
    });
    return await this.#link.linkToTwinoid({
      userId: acx.user.id,
      twinoidUserId: tidUser.id.toString(10),
      linkedBy: acx.user.id,
    });
  }

  async linkToTwinoidWithRef(acx: AuthContext, options: Readonly<LinkToTwinoidWithRefOptions>): Promise<VersionedTwinoidLink> {
    if (acx.type !== AuthType.User) {
      throw new Error(acx.type === AuthType.Guest ? "Unauthorized" : "Forbidden");
    }
    if (!acx.isAdministrator) {
      throw new Error("Forbidden");
    }
    // TODO: Touch twinoid user
    return await this.#link.linkToTwinoid({
      userId: options.userId,
      twinoidUserId: options.twinoidUserId,
      linkedBy: acx.user.id,
    });
  }
}
