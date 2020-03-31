import * as assert from "assert";
import { InMemoryAnnouncementService } from "../../lib/announcement/service.js";
import { UUID4_GENERATOR } from "../../lib/uuid-generator.js";
import { GuestAuthContext } from "@eternal-twin/etwin-api-types/auth/guest-auth-context.js";
import { AuthScope } from "@eternal-twin/etwin-api-types/auth/auth-scope.js";
import { AuthType } from "@eternal-twin/etwin-api-types/auth/auth-type.js";
import { CreateAnnouncementOptions } from "@eternal-twin/etwin-api-types/announcement/create-announcement-options.js";
import { Announcement } from "@eternal-twin/etwin-api-types/announcement/announcement.js";

const guestAuth: GuestAuthContext = {
  type: AuthType.Guest,
  scope: AuthScope.Default,
};

describe("InMemoryAnnouncementService", () => {
  it("compiles", async () => {
    const announcement: InMemoryAnnouncementService = new InMemoryAnnouncementService(UUID4_GENERATOR);
    {
      const announcements = await announcement.getAnnouncements(guestAuth);
      assert.deepStrictEqual(announcements, []);
    }
    {
      const options: CreateAnnouncementOptions = {
        locale: "fr",
        title: "Création d'Eternal-Twin",
        body: "Ouverture d'**Eternal-Twin**!"
      };
      const actual: Announcement = await announcement.createAnnouncement(guestAuth, options);
      const expected: Announcement = {
        id: actual.id,
        createdAt: actual.createdAt,
        revision: {
          id: actual.revision.id,
          date: actual.createdAt,
          locale: "fr",
          title: "Création d'Eternal-Twin",
          body: {
            markdown: "Ouverture d'**Eternal-Twin**!",
            html: "<p>Ouverture d'<strong>Eternal-Twin</strong>!</p>\n"
          }
        },
        locales: new Map(),
      };
      assert.deepStrictEqual(actual, expected);
    }
    {
      const announcements = await announcement.getAnnouncements(guestAuth);
      assert.deepStrictEqual(announcements.length, 1);
    }
  });
});
