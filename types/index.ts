export type Profile = {
  id: string;
  displayName: string;
};

export type MiomiSession = {
  id: string;
  createdAt: string;
};

export type MiomiGenerateBody = {
  topic: string;
  platform: string;
  tone: string;
  language: "thai" | "english" | "both";
  contentType?: string;
};

export type MiomiContentPayload = {
  hook_thai: string;
  hook_english: string;
  caption_thai: string;
  caption_english: string;
  hashtags_thai: string;
  hashtags_english: string;
  cta: string;
  text_overlay: string;
  thumbnail_concept?: string;
  comment_reply_thai?: string;
  script_thai?: string;
  description_thai?: string;
  /** Three reply options for comment_reply_pack flows */
  reply_variant_1_thai?: string;
  reply_variant_1_english?: string;
  reply_variant_2_thai?: string;
  reply_variant_2_english?: string;
  reply_variant_3_thai?: string;
  reply_variant_3_english?: string;
};
