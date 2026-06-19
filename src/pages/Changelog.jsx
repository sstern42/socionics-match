import { useEffect } from 'react'
import Layout from '../components/Layout'
import { usePageMeta } from '../hooks/usePageMeta'

export const ENTRIES = [
     {
       date: '19 June 2026',
       label: 'New',
       items: [
         'Rooms — new Socion room, open to all 16 types in one shared conversation alongside the four quadra rooms. Toast and push notifications now cover it too',
         'Rooms — on desktop, the quadra header, switcher, and active-member list now live in a right-hand sidebar with online status, mirroring the Messages layout',
         'Boards — comments now support one level of threaded replies',
         'Admin — new Top Referrers dashboard card, plus a list of users currently holding referral-earned premium with days remaining',
         'Settings — choose between 12-hour and 24-hour clock display for message timestamps',
         'Referrals — the 180-day cumulative cap is now disclosed in the reward email and on the Premium page, not just in Settings',
         'Connection cap — users who hit the cap right after their referral premium lapsed now see a targeted refer-again-or-upgrade message',
       ],
     },
     {
       date: '18 June 2026',
       label: 'New',
       items: [
         'Boards — new discussion boards open to all members: introductions, type discussions, theory & typing, relationships, and general chat. Post, comment, react, and edit or delete your own posts and comments. Founders/mods can pin posts. Each board shows its post count, and posts now show a view counter',
         'Messages — on desktop, the conversation header (profile, relation, compatibility breakdown) now lives in a right-hand sidebar instead of stacking above the message list, freeing up space to see more of the conversation. Inline action buttons replace the old "..." dropdown',
         'Connection cap — the free-tier 3-connection limit was only checked against the person initiating a connection, so a Premium user (unlimited connections) could push a free-tier user past their cap. Now enforced for both people across new connections, swipe matches, and reconnecting',
         'Messages — connection list divider lines now match the app\'s standard border color instead of looking brighter/whiter than the rest of the UI',
         'Rooms — fixed the room header and notification banner rendering above the visible screen on some mobile browsers (e.g. Samsung devices), with no way to scroll up to reach them',
         'Socionics AI — chat history now persists across reloads, and replies get Copy and Retry buttons',
         'Socionics AI — suggested questions are now personalised to your type\'s relations and your actual active matches',
         'Ask AI — promoted from a buried icon into a labeled link in the main desktop nav',
         'Admin — Reports panel now shows who blocked whom, with an Unblock button to reverse hard blocks',
         'Messages — merged the mobile "Full breakdown" bar and options button into a single compact header row',
       ],
     },
     {
       date: '17 June 2026',
       label: 'New',
       items: [
         'Referrals — invite friends from Settings. Each friend who joins and finishes their profile earns you 30 days of Premium (up to 180 days total), and unlocks a 7-day Premium trial for them',
         'Referrals — founding members and Premium subscribers don\'t need extra days, so referring as one effectively gifts your friend a free 7-day Premium trial — and still counts toward your tier badge',
         'Referrals — Connector, Networker, Catalyst, and Catalyst+ tier badges based on your qualifying referral count',
         'Referrals — Top Connectors leaderboard on Settings, showing the highest-referring members (anonymous-mode users are excluded)',
         'Referrals — referred friends see a "You were invited by [name]" banner during onboarding',
         'Settings and Premium pages now show days remaining on a referral-earned Premium trial, with a clear path to subscribe before it ends',
         'Settings is now linked from the desktop nav (previously only reachable from the mobile menu)',
       ],
     },
     {
       date: '16 June 2026',
       label: 'New',
       items: [
         'Premium — Socion Premium is now available. Unlock unlimited connections, see who viewed your profile with full detail, access your connection stats breakdown, and get the full Model A compatibility breakdown for every conversation. socion.app/premium',
         'Feed — quadra filter. Four colored pills (Alpha/Beta/Gamma/Delta) next to the Filters button let you narrow the feed to one quadra',
         'Feed — profile card borders are now colored by quadra (Alpha gold, Beta red, Gamma teal, Delta blue), so you can spot it at a glance',
         'Feed — purpose filter added to the Filters panel: Dating, Friendship, Networking, or Team building',
         'Feed — "Load all remaining" button added alongside "Load more" so you can fetch every profile at once',
         'Feed — relation filter pill counts now reflect every matching profile, not just what\'s loaded on the page',
         'Feed — activity stats (online now / active today) now reflect only the profiles currently visible to you, so the numbers are accurate to your filtered view',
         'Homepage — Socionics AI now has its own section with example questions you can tap to start chatting instantly',
       ],
     },
     {
       date: '14 June 2026',
       label: 'Update',
       items: [
         'Swipe mode — full-screen on mobile. The card fills the viewport below the header with working touch gestures. Swipe right to like, left to pass',
         'Swipe mode — your swipe history now syncs across devices. Profiles you\'ve already swiped on any device won\'t reappear',
         'Swipe mode — a "Start over" button appears when you\'ve worked through the whole deck',
         'Feed — anonymous profiles are now hidden by default. Use "Show anonymous" in filters if you want to see them',
         'Feed — country flags now render correctly on Windows',
         'Feed — 22 additional countries added to the country selector, including Singapore, Philippines, Malaysia, UAE, and more',
         'Feed — smooth transitions added across page changes, modals, and the Browse ↔ Swipe switch',
         'Feed — online now and active today counts now appear as live stats beneath the Browse/Swipe toggle. Green dot for online now, orange dot for active today. Only shows when at least one count is non-zero',
         'Feed — online now count no longer includes yourself',
         'Feed — profiles, matches, and saved IDs are now cached for 5 minutes with React Query. Re-visiting the feed within that window is instant with zero network requests. A live "updated X min ago" indicator appears next to the activity stats; tap it to force a refresh',
         'Feed — the Load More button now shows how many profiles are in the next batch',
         'Messages — conversation list now loads instantly on re-visit, served from a 60-second React Query cache',
         'Profile views — switching to the Views tab and back reuses the cached result for 5 minutes instead of re-fetching',
         'Saved — saved profiles and connection status now cached for 3 minutes; unsaving removes the card immediately without waiting for a refetch',
         'Network graph — data cached for 10 minutes; re-visiting the graph reuses the result without a reload',
         'Dynamics tab — relation stats cached per user for 10 minutes',
         'Updates — loads the 5 most recent posts initially, with a Load more button to page through older ones',
         'Disconnect — after disconnecting from someone, a confirmation step now appears with a Return to feed button',
         'Free tier — disconnecting from someone correctly frees up a connection slot again',
         'Free tier — "X of 3 connections · Unlock unlimited" is now always visible on the feed',
         'Socionics AI — Reinin dichotomies added to the knowledge base. The AI now knows each type\'s full dichotomy profile and can surface it in conversation',
         'Socion™ — trademark symbol added to the brand name across page titles',
         'Profile photos — avatars now load from cache on repeat visits instead of re-fetching from the CDN every time',
         'Privacy Policy and Terms updated to reflect the paid tier, written typing report, and all features added since launch',
       ],
     },
     {
       date: '12 June 2026',
       label: 'New',
       items: [
         'Socionics AI — ask anything about types, relations, Model A, and compatibility. Find it via the bot icon in the nav or footer, or go directly to socion.app/ask',
         'Socionics AI — responses are personalised to your Socionics type',
         'Socionics AI — available to signed-in members',
       ],
     },
     {
       date: '11 June 2026',
       label: 'Update',
       items: [
         'Stats page — socion.app/stats shows satisfaction ratings by relation type, which relations members connect in most, type distribution across the community, and selected written feedback. Data is live and updates as more connections are rated',
       ],
     },
     {
       date: '10 June 2026',
       label: 'Update',
       items: [
         'Feedback button — a small tab on the right edge of every page lets you report a bug or share a thought without leaving the app',
         'Notification bell — tap the bell in the header to see your recent alerts. Loads your 50 most recent notifications on open, with new ones appearing in real time',
       ],
     },
     {
       date: '9 June 2026',
       label: 'Update',
       items: [
         'Direct messages — react to any message with an emoji. Tap the smiley icon to open the emoji picker. Reactions display as pills below the message with a count',
         'Direct messages — send GIFs via the GIF button in the message bar. Powered by Giphy',
         'Direct messages — share images with an optional caption. Select a photo, type a caption if you want one, then hit Send',
         'Direct messages — tap any image or GIF to view it full size',
         'Direct messages — tap a reply quote inside a message to scroll back to the original',
       ],
     },
     {
      date: '8 June 2026',
      label: 'Update',
      items: [
        'Quadra rooms — send GIFs via the GIF button in the message bar. Search Giphy or browse trending, tap to send',
        'Quadra rooms — all members can now browse other quadra rooms in read-only mode. Use the quadra pills in the room header to switch. Posting, reactions, and replies are only available in your own room',
      ],
    },
    {
      date: '6 June 2026',
      label: 'Update',
      items: [
        'Live notifications — a small toast notification appears in the bottom-left corner when someone sends you a DM, a new connection is made, a new member joins, or there is activity in your quadra room. No refresh needed — just keep the app open',
        'Dual alert — if a new member joining is your Dual type, the toast is highlighted with a ✦ so you know immediately',
        'Feed refresh banner — when new members join while you are browsing, a banner appears above the feed offering to reload it. Tap to refresh, or dismiss to stay put',
        'Who viewed — see who has visited your profile. Premium members get the full list with name, type, relation type, and timestamp. Free accounts see a 7-day view count. Find it under Profile → Views',
        'Stats — a breakdown of your connection history by relation type. Ratings you gave, ratings you received, message volumes, and how each relation compares to the site average. Premium only. Find it under Profile → Stats',
        'Mobile nav — reorganised into primary nav (Matches, Messages, Rooms), a collapsible Profile submenu (View profile, Edit, Dynamics, Notifications, Settings), and a footer links section giving access to Premium, What\'s new, Support, Help, Discord, Privacy, and Terms from mobile for the first time',
        'Offline support — the app now loads and navigates without a network connection. JS, CSS, and the app shell are cached on first visit and served instantly on repeat visits, including offline. Live data requires a connection as normal',
      ],
    },
    {
      date: '5 June 2026',
      label: 'Update',
      items: [
        'Dark mode — switch between light, dark, and system default via the toggle in the header',
        'Tapping a type badge on a profile now opens the Socionics reference inline, without leaving the app',
        'Get Typed page — choose your typist and book directly from the app',
      ],
    },
    {
      date: '3 June 2026',
      label: 'Update',
      items: [
        'Quadra rooms — share images and GIFs directly in the room. Tap the image icon in the message bar, add an optional caption, and hit Send. JPEG, PNG, GIF (including animated), and WebP supported up to 15 MB',
        'Quadra rooms — tap any image to view it full size',
        'Quadra rooms — reply to a message containing an image, caption, or both. Tap the reply quote in any message to jump back to the original',
        'Quadra rooms — URLs in messages are now clickable',
        'Quadra rooms — messages now sync in real time across all your open devices and tabs without needing to refresh',
      ],
    },
    {
      date: '2 June 2026',
      label: 'Update',
      items: [
        'Profile cards — tap a member\'s name on any feed card to open their full profile page. Anonymous profiles stay private and your own preview card is unaffected',
        'View profile — a new tab in Profile lets you see your own public profile exactly as other members see it, with a quick link back to edit',
        'Profile photos — your extra photos now appear as a tappable gallery on your profile page. Tap any photo to view it full size. Photos stay hidden while anonymous mode is on',
        'Quadra rooms — four permanent group chat rooms (Alpha, Beta, Gamma, Delta), auto-assigned by type. All existing members added automatically',
        'Quadra rooms — full message history with pagination, date dividers, and a typing indicator',
        'Quadra rooms — edit your messages, soft-delete with a two-tap confirm, and reply to any message with a quote',
        'Quadra rooms — room push notifications with a per-device cooldown. Enable from inside the room or via Profile → Notifications',
        'Quadra rooms — unread dot on the Rooms nav link, cleared on visit',
        'Connect button on member profile pages — send a connection request directly from a profile, or jump to an existing conversation',
        'Sticky site header — the nav bar stays visible while scrolling on all pages',
      ],
    },
    {
      date: '1 June 2026',
      label: 'Update',
      items: [
        'Get typed — the typing service is now a written report from Spencer Stern. Answer a short questionnaire and receive a considered, reasoned report confirming your type, with your profile updated to match',
        'Get typed — two options: Standard ($29, within 5 days) and Express ($49, within 48 hours)',
        'Get typed — typed in Classical Model A, delivered by email. Pay securely, then you are taken straight to the questionnaire',
        'Profile photos — add up to five more photos to your profile, alongside your main one. They appear on your profile page where connections can tap any to view full size',
        'Profile photos — a clear photo of your face helps people trust your profile and tends to get more connections. Optional, but recommended',
        'Profile photos — all photos stay hidden while anonymous mode is on, the same as your main photo',
        'App loading — Socion now shows a loading screen while it starts up instead of a blank page, and displays a readable message with a reload button if something goes wrong. Helps most on slow or unstable connections, where the app previously could show a white screen until it finished loading',
      ],
    },
    {
      date: '30 May 2026',
      label: 'Fix',
      items: [
        'Swipe mode — mutual match modal now appears correctly for both the first and second swiper. Previously only the second swiper saw the modal; the first swiper would receive a push notification but no in-app modal',
      ],
    },
    {
      date: '29 May 2026',
      label: 'Update',
      items: [
        'Compatibility breakdown — tap "Full breakdown" in any conversation header to see a Model A analysis of that specific dyad: where each person\'s leading and creative functions land in the other\'s stack, the position name, and what it means',
        'Compatibility breakdown — covers strengths, friction points, and a practical note for the relation type. Content is dyad-specific, not a generic relation description',
        'Compatibility breakdown — available on desktop and mobile. On mobile, tap the bar below the conversation header',
        'Compatibility breakdown — premium feature. Founding members have full access',
        'Archive — hide any conversation from your connections list via the ··· menu in a conversation. Archived conversations sit in a collapsible section at the bottom of the list',
        'Archive — tap "Archived (N)" at the bottom of the connections list to expand and access archived conversations',
        'Archive — if the other person sends you a message while a conversation is archived, it returns to the top of your active list automatically',
        'Archive — tap ··· and select Unarchive to restore a conversation manually at any time',
      ],
    },
    {
      date: '27 May 2026',
      label: 'Update',
      items: [
        'Member profiles — tap a profile avatar or name in your conversation list or message thread header to open their full profile page',
        'Profile page — shows their type, your relation, bio, location, and their Discord handle if set',
        'Discord handle — add your Discord username in Profile → Details so connections can find you across both platforms',
        'Discord handle — copyable with one tap from the profile page',
      ],
    },
    {
      date: '26 May 2026',
      label: 'Update',
      items: [
        'Swipe mode — tap Swipe in the feed header to browse profiles one at a time. Drag right to like, left to pass. Buttons below the card work too for desktop and accessibility',
        'Mutual match — when both sides swipe right on each other a match is created automatically and a modal appears with the relation type and a link to start the conversation',
        'Mode preference is remembered across visits — switching between Browse and Swipe stays put',
      ],
    },
    {
      date: '3 May 2026',
      label: 'Update',
      items: [
        'Type — your assessed or selected type is now framed as a working hypothesis rather than a final answer',
        'Get typed — links to verify your type with our typist now appear across the result screen, sign-in page, profile setup, and your own profile (when unverified)',
        'Feed — three new in-feed cards: Get typed for verifying your type with our typist, Read about your type which opens your full Socionics Insight profile in-app, and the shop for type-specific mugs',
        'Feed — every in-feed card can now be dismissed with a small × in the corner. Dismissed cards stay hidden across visits',
        'Feed — the support card now opens the full /support page where you can choose between a Ko-fi tip, the shop, or other ways to help, instead of going straight to Ko-fi',
      ],
    },
    {
      date: '15 April 2026',
      label: 'Update',
      items: [
        'Get typed — typing sessions are now free',
        'Support page — shop link added. Browse 16 type-specific mugs at shop.socionicsinsight.com',
        'Support page — running costs breakdown removed',
      ],
    },
    {
      date: '8 April 2026',
      label: 'Update',
      items: [
        'Get typed — book a one-to-one Socionics typing session with our resident typist via Discord voice call. A verified badge is added to your profile on completion',
        'Get typed — accessible from the nav for all logged-in members',
        'Get typed — Discord username required at the point of booking so the typist can reach you directly',
      ],
    },
    {
      date: '6 April 2026',
      label: 'Update',
      items: [
        'Push notifications — fixed a bug where message push notifications were not being delivered to anyone. Notifications now arrive correctly on all subscribed devices',
        'Push notifications — fixed a bug where the "Your Dual just joined" notification was not firing correctly due to the same underlying issue',
        'Push notifications — stale or revoked subscriptions (e.g. when push is blocked in the browser) are now automatically cleaned up on the next notification attempt',
        'Push notifications — multiple devices are now correctly supported; each device receives notifications independently',
        'Footer — restored on desktop across all pages including Feed, Messages, Profile, and Admin',
        'Message actions — reply, edit, and delete buttons are now always visible at reduced opacity on mobile rather than hidden until long-press',
      ],
    },
    {
      date: '5 April 2026',
      label: 'Update',
      items: [
        'Verified type badges — members whose Socionics type has been professionally verified now show a ✓ on their type badge. Hover to see who verified it. Hidden in anonymous mode',
        'Verified types filter — new filter in the feed to show only members with verified types',
        'Anonymous mode — fixed an issue where members without a date of birth set could not save changes to their profile, including turning off anonymous mode. Date of birth is now optional',
        'Rate this connection — the feedback bar has moved to the top of the conversation, just below the header, so it no longer overlaps the message input',
        'Help button — repositioned consistently across all pages so it no longer overlaps the Send button in messages',
      ],
    },
    {
      date: '4 April 2026',
      label: 'Update',
      items: [
        'Help & FAQ — a ? button fixed to the bottom right of every page opens a full FAQ covering matching, relations, account settings, safety, and push notification troubleshooting by device',
        'In-app reference sheets — tapping a type badge or relation \'Learn more →\' now opens the Socionics Insight page inside Socion rather than a new tab. Works in both the feed and messages',
        'Live profile preview — Profile → Details now shows a live card that updates in real time as you edit your details',
        'Hide activity status — new toggle in Profile → Details to stop others seeing when you were last active. You won\'t appear in Online now or Active today filters while this is on',
        'Onboarding — a one-line note at the start of onboarding now tells you that a sign-in step is coming at the end, so there are no surprises',
        'Member growth chart — replaced the bar chart with a line graph with visible data points',
        'Admin dashboard — sign-ups, connections, and messages now show a +N today delta alongside the total',
      ],
    },
    {
      date: '2 April 2026',
      label: 'Update',
      items: [
        'City field — add your city in Profile → Details so others can see whether meeting up is realistic. Only your city is shown, never a postcode or exact location',
        'Location on cards — city appears alongside your country flag on feed cards',
        'Location filters — filter the feed by Anywhere, Same country, or Same city',
        'Share nudge — moved from a dismissible banner at the top of the feed to a card inline between profiles. Always visible, no dismiss needed',
        'Sign-in page — now shows your type result ("You\'re an ILI") after completing the quiz, so the context carries through to the auth wall',
        'Filters panel — the feed\'s secondary filters (profile, activity, location) are now collapsed behind a single Filters button with a badge count when active. Relation pills unchanged',
        'Support page — socion.app/support explains what the app costs to run and links to Ko-fi. Linked from the footer',
        'Delete last message — hover your last sent message to reveal a trash icon. Tap once to confirm, tap again to delete. Removes the message for both sides',
        'Edit last message — pencil icon appears alongside delete on your last sent message. Tap to edit inline, Enter to save, Escape to cancel. A subtle "· edited" label appears on the timestamp',
      ],
    },
    {
      date: '31 March 2026',
      label: 'Update',
      items: [
        'Connect modal — character counter counts down to zero as you type. Send & connect unlocks automatically at 10 characters',
        'Network graph — fullscreen mode now available on all devices, not just mobile. Button sits top-right of the graph',
        'Network graph — Spread button resets nodes to a wider circle and restarts the simulation. Disabled while the simulation is still settling',
        'Network graph — touch-action disabled on the SVG so dragging nodes on mobile no longer triggers page scroll',
        'Network page — non-logged-in visitors now see a join CTA below the graph',
        'Connections — purpose is now correctly recorded from your actual profile purpose when you connect, rather than defaulting to Dating',
      ],
    },
    {
      date: '30 March 2026',
      label: 'Update',
      items: [
        'Connect with message — a message is now required to connect with someone. Write your introduction before the connection is created',
        'Connection question — set a custom question in Profile → Details that people see before connecting with you. Falls back to a generic prompt if not set',
        'Dynamics page — each relation now shows the matching type in brackets, e.g. Dual (ESE), so you know exactly who you\'d be matched with',
        'Message box — the compose area now grows as you type. Shift + Enter inserts a new line, Enter sends',
        'Multi-line messages — line breaks in sent messages are now preserved in the conversation view',
        'Rate this connection — the feedback prompt is now more descriptive, encouraging you to help validate the theory',
        'Anonymous mode — hide your name, age, photo, and location. Your type and relation are always visible. Toggle on or off at any time in Profile → Details',
        'Known users only — new feed filter to exclude anonymous profiles',
        'Date of birth — age is now calculated from your date of birth rather than entered manually. Only your age is shown on your card, never your DOB',
        'Bio hint — bio is visible even in anonymous mode; keep it vague if you prefer privacy',
        'Push notifications fixed — multi-device delivery now works correctly across all subscriptions',
        'Privacy policy and terms updated — account self-deletion, push notifications, Google sign-in, and MailerLite all documented',
        'Network page — socion.app/network plots every connection between member types. Edge thickness shows volume, colour shows average rating. Refresh to see the latest data',
        'Homepage features section updated — anonymous mode and push notifications added as feature tiles',
      ],
    },
    {
      date: '29 March 2026',
      label: 'Update',
      items: [
        'Account deletion — delete your account permanently from Profile → Details, with confirmation step. All data, matches, and messages are removed.',
        'Sign-in link expired — if your OTP link expires, your email is pre-filled automatically and a one-tap resend button appears',
        'iOS install prompt — now correctly shown only in Safari, where Add to Home Screen is supported',
        'Spread the word — share button on the feed opens the native share sheet on mobile or copies the link on desktop',
        'Admin: sign-ups vs members — see account creations alongside completed profiles to track onboarding drop-off',
        'Admin: active 7d, inactive 7d+, and messaging 7d stat cards added',
        'Admin: mobile layout fixed — stat cards, grids, and padding all responsive on small screens',
        'Admin: analytics exclusion toggle — exclude your device from Umami tracking directly in the dashboard',
        'Discord live-stats: three notification types — new sign-up, profile complete, and new connection (with type pair)',
      ],
    },
    {
      date: '28 March 2026',
      label: 'Update',
      items: [
        'Sign-in now uses a 6-digit code instead of a magic link — more secure and works on any device including iPhone PWA',
        'Push notifications — get notified instantly when you receive a message, on any device',
        'Multi-device push — each device subscribes independently; mobile takes priority when both are active',
        'New connection push — push notification fires when someone connects with you, alongside the existing email',
        'Push notification prompt — modal appears on first visit to messages explaining the value before asking for permission',
        'Notification settings — manage email and push preferences separately in Profile → Notifications',
        'Profile split into three pages — Details, Dynamics, and Notifications, each with its own save',
        'Email notifications now respect opt-out — turn off in profile settings',
        'Email suppressed automatically when push notifications are active on your device',
        'Reply to messages — hover a message on desktop or long-press on mobile to reply with a quote',
        'Typing indicator — see when the other person is composing a message in real time',
        'Messages redesigned — fixed viewport layout on both desktop and mobile, no outer page scroll',
        'Mobile messages full width — conversation fills the screen edge to edge',
        'iOS install prompt — "Add to Home Screen" nudge for Safari users on iPhone and iPad',
        'Feed activity indicators updated — green for online now, amber for active today, brown for active this week',
        'Feed filters — Online now, Active today, and Active this week filters added with a divider separating them from relation filters',
        'Online now count shown on the feed — see how many members are active in the last 15 minutes',
        'Messages sent now shown on the home page stats',
        'Admin dashboard now shows member breakdown by country',
        'Feed purpose filtering moved server-side — faster and more accurate at scale',
        'Duplicate match prevention — database constraint ensures two users can only connect once',
      ],
    },
    {
      date: '27 March 2026',
      label: 'Update',
      items: [
        'Feed now filters by compatible types server-side — faster and accurate at any scale',
        'Feed expanded to show up to 200 profiles (was capped at 20)',
        'PWA support — Socion can now be installed to your home screen on iOS and Android',
        'Relation labels in messages now show correctly for asymmetric relations — Supervisor, Supervisee, Benefactor, and Beneficiary display from your perspective',
        'Last active indicator — green dot on profiles active today, gold for active this week',
        'Feed filters — filter by relation type, active this week, or profiles with photos',
        'Photo modal — tap a profile photo to view it full size',
        'Anonymous mode — opt in to display a 🔒 badge instead of sharing personal details',
        'Message timestamps and date dividers — Today, Yesterday, and date labels between conversation days',
        'Admin: site-wide member growth chart — cumulative signups by day',
        'Admin: site-wide feedback analysis — ratings broken down by relation type with written comments',
        'Admin: editable feed announcement — publish a dismissible banner to all users without a deploy',
        'Footer updated — links to GitHub (open source), Socionics reference, and spencerstern.com',
      ],
    },
    {
      date: '26 March 2026',
      label: 'Update',
      items: [
        'Block & report — permanent block with reason reporting available from any conversation',
        'Cool off — pause messaging and feed visibility for 7 days, lifts automatically',
        'Terms of service added at socion.app/terms',
        'Google One Tap — sign in or create an account with one click, no email needed',
        'Founder badge — displayed on the feed card for the Socion team',
        'Type badges on feed cards now link to the full type profile on socionicsinsight.com',
        'Relation badges now link to the full relation page on socionicsinsight.com',
        'Type assessment data now saved — questionnaire responses recorded for research',
        'Purpose pills on feed cards — see at a glance what each person is looking for',
        'Long bios now expand inline with a Read more toggle',
        'Gender field added to profiles — displayed alongside name and age on cards',
        'Unread message count — badge on the Messages nav link and browser tab title updates live',
        'Messages sidebar now shows last message preview and relative timestamp',
        'Sign out no longer flashes the sign-in page before redirecting home',
        'Messaging input no longer loses focus when sending or receiving messages',
        'Profile edit page now redirects correctly when not signed in',
        'Messaging page no longer hangs if profile data is missing',
      ],
    },
    {
      date: '25 March 2026',
      label: 'Update',
      items: [
        'Magic link sign-in — no password needed, just enter your email',
        'Purpose selector — choose Dating, Friendship, Networking, or Team building (or all four)',
        'Profile photos — upload a photo, shown on feed cards',
        'Country flags — select your country, flag emoji shown on your card',
        'Post-match feedback — rate connections after 5 messages to help validate the theory',
        'Privacy policy added at socion.app/privacy',
        'Email notifications for new connections and messages (with cooldown to avoid spam)',
        'Mobile navigation — burger menu on small screens',
        'Mobile messaging — full-screen conversation view on mobile',
        'Intertype relations matrix corrected — Kindred and Business pairs verified against reference',
        'Relation labels on feed cards now show the other person\'s role, not yours',
      ],
    },
    {
      date: '25 March 2026',
      label: 'Launch',
      items: [
        'Socion is live at socion.app',
        'Type onboarding questionnaire — determine your type or bring your own',
        'Matching feed — browse profiles filtered by intertype relation',
        '16 named relation types — auditable in the open source matrix',
        'Connect and message — realtime messaging with deep-link support from feed cards',
        'Profile editing — update details and relation preferences at any time',
      ],
    },
]

export default function Changelog() {
  usePageMeta("Latest Updates & New Features | Socion™", "A running log of everything added, fixed, and improved on Socion — new features, dynamics updates, AI improvements, and more.")
  useEffect(() => {
    localStorage.setItem('socion_changelog_seen', ENTRIES[0].date)
  }, [])

  return (
    <Layout noScroll hideFooter>
      <section style={{ maxWidth: 680, margin: '0 auto', padding: '4rem 1.5rem' }}>
        <p className="eyebrow">Socion</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
          What's new
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '3rem' }}>
          A running log of updates to socion.app. Newest first.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {ENTRIES.map((entry, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', fontWeight: 500, color: 'var(--text)' }}>
                  {entry.date}
                </span>
                <span style={{
                  fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'var(--accent)', border: '1px solid var(--accent-lt)',
                  padding: '0.15rem 0.5rem', borderRadius: 2,
                }}>
                  {entry.label}
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {entry.items.map((item, j) => (
                  <li key={j} style={{ fontSize: '0.92rem', color: 'var(--text)', lineHeight: 1.7 }}>
                    {item}
                  </li>
                ))}
              </ul>
              {i < ENTRIES.length - 1 && (
                <div style={{ borderBottom: '1px solid var(--border)', marginTop: '3rem' }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>
            Questions or feedback?{' '}
            <a href="https://reddit.com/r/socionics" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              r/socionics
            </a>
            {' '}or{' '}
            <a href="mailto:hello@socion.app" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              hello@socion.app
            </a>
          </p>
        </div>
      </section>
    </Layout>
  )
}
