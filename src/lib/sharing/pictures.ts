/**
 * Finding the pictures of shared tests. A picture lives in the folder of
 * whoever uploaded it (the owner, or a colleague who may edit). The database
 * function `shared_picture_path` says where — and only for people the test
 * is really shared with.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { usedImageIds } from "@/lib/images/imageMath";
import { linkedTestsUsing } from "@/lib/storage/sharedTests";
import { getSharedSnapshot, listTests, parseSharedKey } from "@/lib/storage/testsRepository";
import type { Test } from "@/lib/storage/types";
import { IMAGE_BUCKET } from "@/lib/supabase/config";

export async function findSharedPicture(supabase: SupabaseClient, userId: string | null, imageId: string): Promise<Blob | null> {
  const uses = (test: Test) => usedImageIds([test]).has(imageId);
  const places = [
    ...(getSharedSnapshot() ?? []).filter((entry) => uses(entry.test)).map((entry) => parseSharedKey(entry.key)),
    ...linkedTestsUsing(uses),
    // My own test: a colleague who edits it may have added the picture.
    ...(userId ? listTests().filter(uses).map((test) => ({ ownerId: userId, testId: test.id })) : []),
  ].filter((place) => place !== null).slice(0, 3);
  for (const place of places) {
    const { data: path, error } = await supabase.rpc("shared_picture_path", { test_owner: place.ownerId, test: place.testId, picture: imageId });
    if (error || typeof path !== "string" || !path) continue;
    const { data } = await supabase.storage.from(IMAGE_BUCKET).download(path);
    if (data) return data;
  }
  return null;
}
