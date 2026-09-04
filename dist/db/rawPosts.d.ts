interface RawPost {
    post_id: string;
    raw_text: string;
    author?: string;
    source_group?: string;
    image_url?: string[];
    post_link?: string;
}
export declare function savePosts(posts: RawPost[]): Promise<void>;
export {};
//# sourceMappingURL=rawPosts.d.ts.map