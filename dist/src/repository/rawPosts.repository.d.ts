export declare class RawPostsRepository {
    getPendingRawPosts(): Promise<any[] | {
        error: import("@supabase/postgrest-js").PostgrestError;
    }>;
    markProcessed(postId: string): Promise<null>;
    markIgnore(postId: string): Promise<null>;
}
//# sourceMappingURL=rawPosts.repository.d.ts.map