import { AuthContext } from "@eternal-twin/core/lib/auth/auth-context.js";
import { AuthType } from "@eternal-twin/core/lib/auth/auth-type.js";
import { HtmlText } from "@eternal-twin/core/lib/core/html-text.js";
import { $NullableLocaleId, NullableLocaleId } from "@eternal-twin/core/lib/core/locale-id.js";
import { MarktwinText } from "@eternal-twin/core/lib/core/marktwin-text.js";
import { ObjectType } from "@eternal-twin/core/lib/core/object-type.js";
import { UuidGenerator } from "@eternal-twin/core/lib/core/uuid-generator.js";
import { CreateOrUpdateSystemSectionOptions } from "@eternal-twin/core/lib/forum/create-or-update-system-section-options.js";
import { CreatePostOptions } from "@eternal-twin/core/lib/forum/create-post-options.js";
import { CreateThreadOptions } from "@eternal-twin/core/lib/forum/create-thread-options.js";
import { ForumPostAuthor } from "@eternal-twin/core/lib/forum/forum-post-author.js";
import { ForumPostId } from "@eternal-twin/core/lib/forum/forum-post-id.js";
import { ForumPostListing } from "@eternal-twin/core/lib/forum/forum-post-listing";
import { ForumPostRevisionComment } from "@eternal-twin/core/lib/forum/forum-post-revision-comment.js";
import { NullableForumPostRevisionContent } from "@eternal-twin/core/lib/forum/forum-post-revision-content";
import { ForumPostRevisionId } from "@eternal-twin/core/lib/forum/forum-post-revision-id.js";
import { ForumPostRevision } from "@eternal-twin/core/lib/forum/forum-post-revision.js";
import { ForumPost } from "@eternal-twin/core/lib/forum/forum-post.js";
import { ForumSectionDisplayName } from "@eternal-twin/core/lib/forum/forum-section-display-name.js";
import { $ForumSectionId, ForumSectionId } from "@eternal-twin/core/lib/forum/forum-section-id.js";
import { ForumSectionKey } from "@eternal-twin/core/lib/forum/forum-section-key.js";
import { ForumSectionMeta } from "@eternal-twin/core/lib/forum/forum-section-meta.js";
import { ForumSection } from "@eternal-twin/core/lib/forum/forum-section.js";
import { $ForumThreadId, ForumThreadId } from "@eternal-twin/core/lib/forum/forum-thread-id.js";
import { ForumThreadKey } from "@eternal-twin/core/lib/forum/forum-thread-key.js";
import { ForumThreadListing } from "@eternal-twin/core/lib/forum/forum-thread-listing.js";
import { ForumThreadMeta } from "@eternal-twin/core/lib/forum/forum-thread-meta.js";
import { ForumThread } from "@eternal-twin/core/lib/forum/forum-thread.js";
import { GetThreadOptions } from "@eternal-twin/core/lib/forum/get-thread-options.js";
import { ForumService } from "@eternal-twin/core/lib/forum/service.js";
import { UserService } from "@eternal-twin/core/lib/user/service.js";
import { $UserRef, UserRef } from "@eternal-twin/core/lib/user/user-ref.js";
import {
  ForumPostRevisionRow,
  ForumPostRow,
  ForumSectionRow,
  ForumThreadRow,
} from "@eternal-twin/etwin-pg/lib/schema.js";
import { renderMarktwin } from "@eternal-twin/marktwin";
import { Database, Queryable, TransactionMode } from "@eternal-twin/pg-db";

export class PgForumService implements ForumService {
  private readonly database: Database;
  private readonly uuidGen: UuidGenerator;
  private readonly user: UserService;

  constructor(database: Database, uuidGen: UuidGenerator, user: UserService) {
    this.database = database;
    this.uuidGen = uuidGen;
    this.user = user;
  }

  getThreads(_acx: AuthContext, _sectionIdOrKey: string): Promise<ForumThreadListing> {
    throw new Error("Method not implemented.");
  }

  async createThread(acx: AuthContext, sectionIdOrKey: string, options: CreateThreadOptions): Promise<ForumThread> {
    return this.database.transaction(TransactionMode.ReadWrite, async (q: Queryable) => {
      return this.createThreadTx(q, acx, sectionIdOrKey, options);
    });
  }

  async createPost(acx: AuthContext, threadId: string, options: CreatePostOptions): Promise<ForumPost> {
    return this.database.transaction(TransactionMode.ReadWrite, async (q: Queryable) => {
      return this.createPostTx(q, acx, threadId, options);
    });
  }

  async createOrUpdateSystemSection(
    key: string,
    options: CreateOrUpdateSystemSectionOptions,
  ): Promise<ForumSection> {
    return this.database.transaction(TransactionMode.ReadWrite, async (q: Queryable) => {
      return this.createOrUpdateSystemSectionTx(q, key, options);
    });
  }

  async getSections(): Promise<ForumSection[]> {
    throw new Error("Method not implemented.");
  }

  async getSectionById(_id: string): Promise<ForumSection | null> {
    throw new Error("Method not implemented.");
  }

  async getThreadById(
    acx: AuthContext,
    threadId: ForumThreadId,
    options: GetThreadOptions,
  ): Promise<ForumThread | null> {
    return this.database.transaction(TransactionMode.ReadOnly, async (q: Queryable) => {
      return this.getThreadByIdTx(q, acx, threadId, options);
    });
  }

  async createOrUpdateSystemSectionTx(
    queryable: Queryable,
    key: string,
    options: CreateOrUpdateSystemSectionOptions,
  ): Promise<ForumSection> {
    if (!$NullableLocaleId.test(options.locale)) {
      throw new Error("InvalidLocalId");
    }
    type OldRow = Pick<ForumSectionRow, "forum_section_id" | "key" | "ctime" | "display_name" | "locale">;
    const oldRow: OldRow | undefined = await queryable.oneOrNone(
      `
        SELECT forum_section_id, key, ctime,
          display_name, locale
        FROM forum_sections
        WHERE key = $1::VARCHAR;`,
      [key],
    );

    if (oldRow === undefined) {
      const forumSectionId: ForumSectionId = this.uuidGen.next();
      type Row = Pick<ForumSectionRow, "forum_section_id" | "ctime">;
      const row: Row = await queryable.one(
        `INSERT INTO forum_sections(
          forum_section_id, key, ctime,
          display_name, display_name_mtime,
          locale, locale_mtime
        )
           VALUES (
             $1::UUID, $2::VARCHAR, NOW(),
             $3::VARCHAR, NOW(),
             $4::VARCHAR, NOW()
           )
           RETURNING forum_section_id, ctime;`,
        [
          forumSectionId, key,
          options.displayName,
          options.locale,
        ],
      );
      return {
        type: ObjectType.ForumSection,
        id: row.forum_section_id,
        key: key,
        ctime: row.ctime,
        displayName: options.displayName,
        locale: options.locale,
        threads: {
          offset: 0,
          limit: 50,
          count: 0,
          items: [],
        },
      };
    } else {
      const displayName: ForumSectionDisplayName | undefined = oldRow.display_name === options.displayName
        ? undefined
        : options.displayName;
      const locale: NullableLocaleId | undefined = oldRow.locale === options.locale
        ? undefined
        : options.locale;

      if (displayName !== undefined) {
        throw new Error("NotImplemented: Update section display name");
      }
      if (locale !== undefined) {
        throw new Error("NotImplemented: Update section locale");
      }
      const threads = await this.getThreadsTx(queryable, oldRow.forum_section_id, 0, 50);
      return {
        type: ObjectType.ForumSection,
        id: oldRow.forum_section_id,
        key: oldRow.key,
        ctime: oldRow.ctime,
        displayName: displayName ?? oldRow.display_name,
        locale: locale !== undefined ? locale : (oldRow.locale as NullableLocaleId),
        threads,
      };
    }
  }

  private async getSectionMetaTx(
    queryable: Queryable,
    sectionIdOrKey: ForumSectionId | ForumSectionKey,
  ): Promise<ForumSectionMeta | null> {
    let sectionId: ForumSectionId | null = null;
    let sectionKey: ForumSectionKey | null = null;
    if ($ForumSectionId.test(sectionIdOrKey)) {
      sectionId = sectionIdOrKey;
    } else {
      sectionKey = sectionIdOrKey;
    }
    type Row =
      Pick<ForumSectionRow, "forum_section_id" | "key" | "ctime" | "display_name" | "locale">
      & {thread_count: number};
    const row: Row | undefined = await queryable.oneOrNone(
      `WITH section AS (
        SELECT forum_section_id, key, ctime, display_name, locale
        FROM forum_sections
        WHERE forum_section_id = $1::UUID OR key = $2::VARCHAR
      ),
           thread_count AS (
             SELECT COUNT(*)::INT AS thread_count
             FROM forum_threads, section
             WHERE forum_threads.forum_section_id = section.forum_section_id
           )
         SELECT forum_section_id, key, ctime, display_name, locale, thread_count
         FROM section, thread_count;
      `,
      [sectionId, sectionKey],
    );
    if (row === undefined) {
      return null;
    }

    return {
      type: ObjectType.ForumSection,
      id: row.forum_section_id,
      key: row.key,
      displayName: row.display_name,
      ctime: row.ctime,
      locale: row.locale as NullableLocaleId,
      threads: {
        count: row.thread_count,
      },
    };
  }

  private async getThreadsTx(
    queryable: Queryable,
    sectionIdOrKey: ForumSectionId | ForumSectionKey,
    offset: number,
    limit: number,
  ): Promise<ForumThreadListing> {
    const section: ForumSectionMeta | null = await this.getSectionMetaTx(queryable, sectionIdOrKey);
    if (section === null) {
      throw new Error("SectionNotFound");
    }
    type Row = Pick<ForumThreadRow, "forum_thread_id" | "key" | "title" | "ctime" | "is_pinned" | "is_locked">;
    const rows: Row[] = await queryable.many(
      `SELECT forum_thread_id, title, ctime, is_pinned, is_locked
         FROM forum_threads
         WHERE forum_section_id = $1::UUID`,
      [section.id],
    );
    const items: ForumThreadMeta[] = [];
    for (const row of rows) {
      const thread: ForumThreadMeta = {
        type: ObjectType.ForumThread,
        id: row.forum_thread_id,
        key: row.key,
        title: row.title,
        ctime: row.ctime,
        isPinned: row.is_pinned,
        isLocked: row.is_locked,
        posts: {count: 1},
      };
      items.push(thread);
    }
    return {
      offset,
      limit,
      count: section.threads.count,
      items,
    };
  }

  async createThreadTx(
    queryable: Queryable,
    acx: AuthContext,
    sectionIdOrKey: string,
    options: CreateThreadOptions,
  ): Promise<ForumThread> {
    const section: ForumSectionMeta | null = await this.getSectionMetaTx(queryable, sectionIdOrKey);
    if (section === null) {
      throw new Error("SectionNotFound");
    }
    const threadId: ForumThreadId = this.uuidGen.next();
    type Row = Pick<ForumThreadRow, "ctime" | "title">;
    const row: Row = await queryable.one(
      `INSERT INTO forum_threads(
        forum_thread_id, key, ctime,
        title, title_mtime,
        forum_section_id,
        is_pinned, is_pinned_mtime,
        is_locked, is_locked_mtime
      )
         VALUES (
           $1::UUID, NULL, NOW(),
           $2::VARCHAR, NOW(),
           $3::UUID,
           FALSE, NOW(),
           FALSE, NOW()
         )
         RETURNING ctime, title;
      `,
      [threadId, options.title, section.id],
    );

    await this.createPostTx(queryable, acx, threadId, {body: options.body});

    const threadMeta: ForumThreadMeta = {
      type: ObjectType.ForumThread,
      id: threadId,
      key: null,
      ctime: row.ctime,
      title: row.title,
      isPinned: false,
      isLocked: false,
      posts: {count: 1},
    };
    const posts: ForumPostListing = await this.getPostsTx(queryable, acx, threadMeta, 0, 20);
    return {
      ...threadMeta,
      section: {...section, threads: {count: section.threads.count + 1}},
      posts,
    };
  }

  async createPostTx(
    queryable: Queryable,
    acx: AuthContext,
    threadId: ForumThreadId,
    options: CreatePostOptions,
  ): Promise<ForumPost> {
    if (acx.type !== AuthType.User) {
      throw new Error(acx.type === AuthType.Guest ? "Unauthorized" : "Forbidden");
    }
    const postId: ForumPostId = this.uuidGen.next();
    type Row = Pick<ForumPostRow, "ctime">;
    const row: Row = await queryable.one(
      `INSERT INTO forum_posts(
        forum_post_id, ctime, forum_thread_id
      )
         VALUES (
           $1::UUID, NOW(), $2::UUID
         )
         RETURNING ctime;
      `,
      [postId, threadId],
    );
    const author: ForumPostAuthor = $UserRef.clone(acx.user);
    const revision = await this.createPostRevisionTx(queryable, acx, postId, author, options.body, null, null);

    return {
      type: ObjectType.ForumPost,
      id: postId,
      ctime: row.ctime,
      author,
      revisions: {
        count: 1,
        latest: revision,
      },
    };
  }

  async createPostRevisionTx(
    queryable: Queryable,
    _acx: AuthContext,
    postId: ForumPostId,
    author: ForumPostAuthor,
    body: MarktwinText | null,
    modBody: MarktwinText | null,
    comment: ForumPostRevisionComment | null,
  ): Promise<ForumPostRevision> {
    if (author.type !== ObjectType.User) {
      throw new Error("NotImeplemented: Non-User post author");
    }
    const revisionId: ForumPostRevisionId = this.uuidGen.next();
    const htmlBody: HtmlText | null = body !== null ? renderMarktwin(body) : null;
    const htmlModBody: HtmlText | null = modBody !== null ? renderMarktwin(modBody) : null;
    type Row = Pick<ForumPostRevisionRow, "time">;
    const row: Row = await queryable.one(
      `INSERT INTO forum_post_revisions(
        forum_post_revision_id, time, body, _html_body, mod_body, _html_mod_body, forum_post_id, author_id, comment
      )
         VALUES (
           $1::UUID, NOW(), $2::TEXT, $3::TEXT, $4::TEXT, $5::TEXT, $6::UUID, $7::UUID, $8::VARCHAR
         )
         RETURNING time;
      `,
      [revisionId, body, htmlBody, modBody, htmlModBody, postId, author.id, comment],
    );
    return {
      type: ObjectType.ForumPostRevision,
      id: revisionId,
      time: row.time,
      content: body !== null ? {marktwin: body, html: htmlBody!} : null,
      moderation: modBody !== null ? {marktwin: modBody, html: htmlModBody!} : null,
      author,
      comment,
    };
  }

  private async getThreadByIdTx(
    queryable: Queryable,
    acx: AuthContext,
    threadIdOrKey: ForumThreadId | ForumThreadKey,
    options: GetThreadOptions,
  ): Promise<ForumThread | null> {
    const thread: ForumThreadMeta | null = await this.getThreadMetaTx(queryable, threadIdOrKey);
    if (thread === null) {
      return null;
    }
    const posts: ForumPostListing = await this.getPostsTx(queryable, acx, thread, options.postOffset, options.postLimit);
    return {
      type: ObjectType.ForumThread,
      id: thread.id,
      key: thread.key,
      ctime: thread.ctime,
      section: null as any,
      isPinned: thread.isPinned,
      isLocked: thread.isLocked,
      title: thread.title,
      posts,
    };
  }

  private async getPostsTx(
    queryable: Queryable,
    acx: AuthContext,
    thread: ForumThreadMeta,
    offset: number,
    limit: number,
  ): Promise<ForumPostListing> {
    type Row = Pick<ForumPostRow, "forum_post_id" | "ctime">
      & {
      latest_revision_id: ForumPostRevisionRow["forum_post_revision_id"],
      latest_revision_time: ForumPostRevisionRow["time"],
      latest_revision_body: ForumPostRevisionRow["body"],
      latest_revision_html_body: ForumPostRevisionRow["_html_body"],
      latest_revision_mod_body: ForumPostRevisionRow["mod_body"],
      latest_revision_html_mod_body: ForumPostRevisionRow["_html_mod_body"],
      latest_revision_comment: ForumPostRevisionRow["comment"],
      latest_revision_author_id: ForumPostRevisionRow["author_id"],
      first_revision_author_id: ForumPostRevisionRow["author_id"],
    };
    const rows: Row[] = await queryable.many(
      `WITH posts AS (
        SELECT forum_post_id, ctime,
          LAST_VALUE(forum_post_revision_id) OVER w AS latest_revision_id,
          LAST_VALUE(time) OVER w AS latest_revision_time,
          LAST_VALUE(body) OVER w AS latest_revision_body,
          LAST_VALUE(_html_body) OVER w AS latest_revision_html_body,
          LAST_VALUE(mod_body) OVER w AS latest_revision_mod_body,
          LAST_VALUE(_html_mod_body) OVER w AS latest_revision_html_mod_body,
          LAST_VALUE(comment) OVER w AS latest_revision_comment,
          LAST_VALUE(author_id) OVER w AS latest_revision_author_id,
          FIRST_VALUE(author_id) OVER w AS first_revision_author_id,
          ROW_NUMBER() OVER w AS rn
        FROM forum_post_revisions
               INNER JOIN forum_posts USING (forum_post_id)
        WHERE forum_thread_id = $1::UUID
        WINDOW w AS (PARTITION BY forum_post_id ORDER BY time ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
      )
         SELECT forum_post_id, ctime,
           latest_revision_id,
           latest_revision_time,
           latest_revision_body, latest_revision_html_body,
           latest_revision_mod_body, latest_revision_html_mod_body,
           latest_revision_comment,
           latest_revision_author_id,
           first_revision_author_id
         FROM posts
         WHERE posts.rn = 1;`,
      [thread.id],
    );
    const items: ForumPost[] = [];
    for (const row of rows) {
      let content: NullableForumPostRevisionContent = null;
      if (row.latest_revision_body !== null && row.latest_revision_html_body !== null) {
        content = {
          marktwin: row.latest_revision_body,
          html: row.latest_revision_html_body,
        };
      }
      let moderation: NullableForumPostRevisionContent = null;
      if (row.latest_revision_mod_body !== null && row.latest_revision_html_mod_body !== null) {
        moderation = {
          marktwin: row.latest_revision_mod_body,
          html: row.latest_revision_html_mod_body,
        };
      }
      const firstRevAuthor: UserRef | null = await this.user.getUserRefById(acx, row.first_revision_author_id);
      if (firstRevAuthor === null) {
        throw new Error("AssertionError: Null author");
      }
      const lastRevAuthor: UserRef | null = await this.user.getUserRefById(acx, row.latest_revision_author_id);
      if (lastRevAuthor === null) {
        throw new Error("AssertionError: Null author");
      }
      const post: ForumPost = {
        type: ObjectType.ForumPost,
        id: row.forum_post_id,
        ctime: row.ctime,
        author: firstRevAuthor,
        revisions: {
          count: 1,
          latest: {
            type: ObjectType.ForumPostRevision,
            id: row.latest_revision_id,
            time: row.latest_revision_time,
            author: lastRevAuthor,
            comment: row.latest_revision_comment,
            content,
            moderation,
          },
        },
      };
      items.push(post);
    }
    return {
      offset,
      limit,
      count: thread.posts.count,
      items,
    };
  }

  private async getThreadMetaTx(
    queryable: Queryable,
    threadIdOrKey: ForumThreadId | ForumThreadKey,
  ): Promise<ForumThreadMeta | null> {
    let threadId: ForumSectionId | null = null;
    let threadKey: ForumSectionKey | null = null;
    if ($ForumThreadId.test(threadIdOrKey)) {
      threadId = threadIdOrKey;
    } else {
      threadKey = threadIdOrKey;
    }
    type Row =
      Pick<ForumThreadRow, "forum_thread_id" | "key" | "ctime" | "title" | "is_pinned" | "is_locked">
      & {post_count: number};
    const row: Row | undefined = await queryable.oneOrNone(
      `
        WITH thread AS (
          SELECT forum_thread_id, ctime, title
          FROM forum_threads
          WHERE forum_section_id = $1::UUID OR key = $2::VARCHAR
        ),
          post_count AS (
            SELECT COUNT(*)::INT AS post_count
            FROM forum_posts, thread
            WHERE forum_posts.forum_thread_id = thread.forum_thread_id
          )
        SELECT forum_thread_id, ctime, title, post_count
        FROM thread, post_count;
      `,
      [threadId, threadKey],
    );
    if (row === undefined) {
      return null;
    }
    return {
      type: ObjectType.ForumThread,
      id: row.forum_thread_id,
      key: row.key,
      title: row.title,
      ctime: row.ctime,
      isPinned: row.is_pinned,
      isLocked: row.is_locked,
      posts: {
        count: row.post_count,
      },
    };
  }
}
