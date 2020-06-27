import { InjectionToken } from "@angular/core";
import { AuthContext } from "@eternal-twin/core/lib/auth/auth-context";
import { ForumService } from "@eternal-twin/core/lib/forum/service";
import { UserService } from "@eternal-twin/core/lib/user/service";

export const AUTH_CONTEXT: InjectionToken<AuthContext> = new InjectionToken("AuthContext");

export const FORUM: InjectionToken<ForumService> = new InjectionToken("ForumService");

export const USER: InjectionToken<UserService> = new InjectionToken("UserService");
