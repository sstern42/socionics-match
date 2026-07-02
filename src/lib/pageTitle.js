// Central source of truth for document.title. Page-level hooks (usePageTitle,
// usePageMeta) set the "base" title; Layout overlays the unread-message badge
// on top of it. Keeping these separate prevents whichever effect fires last
// from clobbering the other's contribution (previously Layout's unread effect
// would reset document.title straight to 'Socion™', wiping out per-page
// titles set by ancestor pages whenever the unread count changed).
let baseTitle = 'Socion™'
let unreadBadge = 0

function apply() {
  document.title = unreadBadge > 0 ? `(${unreadBadge}) ${baseTitle}` : baseTitle
}

export function setBaseTitle(title) {
  baseTitle = title || 'Socion™'
  apply()
}

export function setUnreadBadge(count) {
  unreadBadge = count || 0
  apply()
}
