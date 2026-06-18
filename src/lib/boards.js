import { supabase } from './supabase'

const POST_PAGE_SIZE = 20

const BOARD_POST_SELECT = `
  id,
  board_id,
  author_id,
  title,
  content,
  pinned,
  views,
  created_at,
  edited_at,
  deleted_at,
  author:author_id ( id, type, profile_data, avatar_url, verified_by ),
  reactions:board_post_reactions ( user_id, emoji ),
  comments:board_comments ( id )
`

const BOARD_COMMENT_SELECT = `
  id,
  post_id,
  author_id,
  content,
  created_at,
  edited_at,
  deleted_at,
  author:author_id ( id, type, profile_data, avatar_url, verified_by ),
  reactions:board_comment_reactions ( user_id, emoji )
`

// Fetch all active boards, ordered for display, with a live post count per board.
export async function getBoards() {
  const { data, error } = await supabase
    .from('boards')
    .select('id, slug, name, description, sort_order')
    .order('sort_order', { ascending: true })

  if (error) throw error
  const boards = data ?? []

  const counts = await Promise.all(
    boards.map(b =>
      supabase
        .from('board_posts')
        .select('id', { count: 'exact', head: true })
        .eq('board_id', b.id)
        .is('deleted_at', null)
    )
  )

  return boards.map((b, i) => ({ ...b, postCount: counts[i].count ?? 0 }))
}

export async function getBoardBySlug(slug) {
  const { data, error } = await supabase
    .from('boards')
    .select('id, slug, name, description, sort_order')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return data
}

// Fetch a page of posts for a board, pinned first then newest.
export async function getBoardPosts(boardId, { before = null } = {}) {
  let query = supabase
    .from('board_posts')
    .select(BOARD_POST_SELECT)
    .eq('board_id', boardId)
    .is('deleted_at', null)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(POST_PAGE_SIZE)

  if (before) query = query.lt('created_at', before)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getBoardPost(postId) {
  const { data, error } = await supabase
    .from('board_posts')
    .select(BOARD_POST_SELECT)
    .eq('id', postId)
    .maybeSingle()

  if (error) throw error
  return data
}

// Registers a view/impression on a post. No-op for the post's own author.
export async function incrementBoardPostView(postId) {
  const { error } = await supabase.rpc('increment_board_post_view', { p_post_id: postId })
  if (error) throw error
}

export async function createBoardPost({ boardId, authorId, title, content }) {
  const { data, error } = await supabase
    .from('board_posts')
    .insert({ board_id: boardId, author_id: authorId, title: title.trim(), content: content.trim() })
    .select(BOARD_POST_SELECT)
    .single()

  if (error) throw error
  window.umami?.track('board-post-created')
  return data
}

export async function setPostPinned(postId, pinned) {
  const { error } = await supabase
    .from('board_posts')
    .update({ pinned })
    .eq('id', postId)

  if (error) throw error
  window.umami?.track('board-post-pin-toggled', { pinned })
}

export async function editBoardPost({ postId, title, content }) {
  const { error } = await supabase
    .from('board_posts')
    .update({ title: title.trim(), content: content.trim(), edited_at: new Date().toISOString() })
    .eq('id', postId)

  if (error) throw error
}

export async function softDeleteBoardPost(postId) {
  const { error } = await supabase
    .from('board_posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', postId)

  if (error) throw error
}

export async function getBoardComments(postId) {
  const { data, error } = await supabase
    .from('board_comments')
    .select(BOARD_COMMENT_SELECT)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createBoardComment({ postId, authorId, content }) {
  const { data, error } = await supabase
    .from('board_comments')
    .insert({ post_id: postId, author_id: authorId, content: content.trim() })
    .select(BOARD_COMMENT_SELECT)
    .single()

  if (error) throw error
  window.umami?.track('board-comment-created')
  return data
}

export async function editBoardComment({ commentId, content }) {
  const { error } = await supabase
    .from('board_comments')
    .update({ content: content.trim(), edited_at: new Date().toISOString() })
    .eq('id', commentId)

  if (error) throw error
}

export async function softDeleteBoardComment(commentId) {
  const { error } = await supabase
    .from('board_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId)

  if (error) throw error
}

export async function reportBoardContent({ postId = null, commentId = null, reporterId, reason = null }) {
  const { error } = await supabase
    .from('board_reports')
    .insert({ post_id: postId, comment_id: commentId, reporter_id: reporterId, reason })

  if (error) throw error
  window.umami?.track('board-content-reported')
}

export async function addPostReaction({ postId, userId, emoji }) {
  const { error } = await supabase
    .from('board_post_reactions')
    .upsert({ post_id: postId, user_id: userId, emoji }, { onConflict: 'post_id,user_id,emoji', ignoreDuplicates: true })
  if (error) throw error
}

export async function removePostReaction({ postId, userId, emoji }) {
  const { error } = await supabase
    .from('board_post_reactions')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
  if (error) throw error
}

export async function addCommentReaction({ commentId, userId, emoji }) {
  const { error } = await supabase
    .from('board_comment_reactions')
    .upsert({ comment_id: commentId, user_id: userId, emoji }, { onConflict: 'comment_id,user_id,emoji', ignoreDuplicates: true })
  if (error) throw error
}

export async function removeCommentReaction({ commentId, userId, emoji }) {
  const { error } = await supabase
    .from('board_comment_reactions')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
  if (error) throw error
}
