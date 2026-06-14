# Changelog

All notable changes to [socion.app](https://socion.app). Newest first.

---

## 14 June 2026

### Added
- **Feed activity stats**: Live "online now" (green dot) and "active today" (orange dot) counts now appear beneath the Browse/Swipe toggle, fetched from the users table and hidden when both are zero.
- **Reinin dichotomies in Socionics AI**: The chatbot now includes a full per-type Reinin dichotomy lookup in its system prompt, and surfaces a starter question about Reinin dichotomies to prompt discovery.

### Fixed
- **Online now count**: The current user is now subtracted from the "online now" count so members don't see themselves included.
- **Avatar caching**: Service worker intercepts Supabase storage image URLs and serves them cache-first. Cache busting is automatic via the `?t=<timestamp>` query param already embedded in avatar URLs, so stale images are never shown.

### Changed
- **Brand name**: Added ™ to Socion across all page meta titles (`index.html`, `Layout.jsx`, `usePageTitle.js`, `Home.jsx`).
- **Privacy Policy & Terms**: Updated to reflect the paid tier, get-typed written report, profile photos, and all features added since the original launch docs were written.
- **SEO**: Added `/about`, `/help`, `/typing`, and `/stats` to the sitemap; added missing private routes to `robots.txt`.

---

## 13 June 2026

### Added
- **Socionics AI — daily message count**: A live count of how many AI messages you've sent today appears next to the New Chat button in the chat header. Count persists across page revisits via `localStorage`.

### Fixed
- **Socionics AI — Kindred relation**: Fixed incorrect relation mapping in the chat system that was misidentifying Kindred connections.
- **Socionics AI — relation display**: Fixed relation types showing incorrectly in the chat context for certain type pairings.

### Changed
- **Meta titles**: All signed-in pages now use the `usePageTitle` hook for a consistent `Page | Socion™` title format.

---

## 12 June 2026

### Added
- **Socionics AI**: Ask anything about types, relations, Model A, and compatibility. Find it via the bot icon in the nav or footer, or go directly to socion.app/ask.
- **Socionics AI — personalised responses**: Responses are tailored to your Socionics type.
- **Socionics AI — members only**: Available to signed-in members. Daily message limit applies.

---

## 11 June 2026

### Added
- **Stats page**: socion.app/stats shows satisfaction ratings by relation type, which relations members connect in most, type distribution across the community, and selected written feedback. Data is live.

---

## 10 June 2026

### Added
- **Feedback button**: A small tab on the right edge of every page lets you report a bug or share a thought without leaving the app.
- **Notification bell**: Tap the bell in the header to see recent alerts. Loads 50 most recent on open, with new ones arriving in real time.

---

## 9 June 2026

### Added
- **DM reactions**: React to any message with an emoji. Tap the smiley icon to open the picker. Reactions display as pills below the message with a count.
- **DM GIFs**: Send GIFs via the GIF button in the message bar. Powered by Giphy.
- **DM image sharing**: Share images with an optional caption.
- **DM image viewer**: Tap any image or GIF to view it full size.
- **DM reply scroll**: Tap a reply quote inside a message to scroll back to the original.

---

## 8 June 2026

### Added
- **Quadra rooms — GIFs**: Send GIFs via the GIF button. Search Giphy or browse trending.
- **Quadra rooms — read-only browsing**: All members can browse other quadra rooms in read-only mode. Use the quadra pills in the room header to switch. Posting, reactions, and replies are only available in your own room.

---

## 6 June 2026

### Added
- **Live toast notifications**: A small toast appears in the bottom-left corner when someone sends you a DM, a new connection is made, a new member joins, or there is activity in your quadra room. No refresh needed.
- **Dual alert**: If a new member joining is your Dual type, the toast is highlighted with a ✦.
- **Feed refresh banner**: When new members join while you are browsing, a banner appears above the feed offering to reload it.
- **Who viewed**: See who has visited your profile. Premium members get the full list with name, type, relation type, and timestamp. Free accounts see a 7-day view count. Find it under Profile → Views.
- **Connection stats**: A breakdown of your connection history by relation type — ratings given and received, message volumes, and comparison to site average. Premium only. Find it under Profile → Stats.
- **Mobile nav redesign**: Primary nav (Matches, Messages, Rooms), a collapsible Profile submenu, and a footer links section giving access to Premium, What's new, Support, Help, Discord, Privacy, and Terms from mobile for the first time.
- **Offline support**: The app loads and navigates without a network connection. JS, CSS, and the app shell are cached on first visit and served instantly on repeat visits, including offline.

---

## 5 June 2026

### Added
- **Dark mode**: Switch between light, dark, and system default via the toggle in the header.
- **Inline type reference**: Tapping a type badge on a profile now opens the Socionics reference inline, without leaving the app.
- **Get Typed page**: Choose your typist and book directly from the app.

---

## 3 June 2026

### Added
- **Quadra rooms — image & GIF sharing**: Share images and GIFs directly in the room. JPEG, PNG, GIF (including animated), and WebP supported up to 15 MB. Add an optional caption.
- **Quadra rooms — full-size image viewer**: Tap any image to view it full size.
- **Quadra rooms — reply to images**: Reply to a message containing an image, caption, or both. Tap the reply quote to jump back to the original.
- **Quadra rooms — clickable URLs**: URLs in messages are now clickable.
- **Quadra rooms — real-time sync**: Messages now sync in real time across all open devices and tabs without needing to refresh.

---

## 2 June 2026

### Added
- **Profile page links**: Tap a member's name on any feed card to open their full profile page. Anonymous profiles stay private and your own preview card is unaffected.
- **View your own profile**: A new tab in Profile lets you see your public profile exactly as other members see it.
- **Extra photos gallery**: Your additional photos appear as a tappable gallery on your profile page. Photos stay hidden while anonymous mode is on.
- **Quadra rooms**: Four permanent group chat rooms (Alpha, Beta, Gamma, Delta), auto-assigned by type. All existing members added automatically.
- **Quadra rooms — full history**: Message history with pagination, date dividers, and a typing indicator.
- **Quadra rooms — message management**: Edit your messages, soft-delete with two-tap confirm, reply to any message with a quote.
- **Quadra rooms — push notifications**: Room push notifications with per-device cooldown. Enable from inside the room or via Profile → Notifications.
- **Quadra rooms — unread dot**: Unread dot on the Rooms nav link, cleared on visit.
- **Connect from profile**: Send a connection request directly from a member's profile page, or jump to an existing conversation.
- **Sticky header**: The nav bar stays visible while scrolling on all pages.

---

## 1 June 2026

### Added
- **Get Typed — written report**: A considered, reasoned written report confirming your type, with your profile updated to match. Standard ($29, within 5 days) and Express ($49, within 48 hours).
- **Get Typed — payment**: Pay securely, then go straight to the questionnaire. Report delivered by email.
- **Extra profile photos**: Add up to five additional photos alongside your main one. All photos stay hidden while anonymous mode is on.
- **App loading screen**: Socion now shows a loading screen while it starts up instead of a blank page, with a readable error message and reload button if something goes wrong.

---

## 30 May 2026

### Fixed
- **Swipe mode — mutual match modal**: Now appears correctly for both the first and second swiper. Previously only the second swiper saw the modal; the first received a push notification but no in-app modal.

---

## 29 May 2026

### Added
- **Compatibility breakdown**: Tap "Full breakdown" in any conversation header for a Model A analysis of that specific dyad — where each person's leading and creative functions land in the other's stack, the position name, what it means, strengths, friction points, and a practical note. Premium feature; founding members have full access.
- **Archive**: Hide any conversation from your connections list via the ··· menu. Archived conversations sit in a collapsible section at the bottom of the list. Unarchives automatically if the other person messages you.

---

## 27 May 2026

### Added
- **Profile page from conversations**: Tap a profile avatar or name in your conversation list or message thread header to open their full profile page.
- **Discord handle**: Add your Discord username in Profile → Details. Copyable with one tap from the profile page.

---

## 26 May 2026

### Added
- **Swipe mode**: Tap Swipe in the feed header to browse profiles one at a time. Drag right to like, left to pass. Buttons below the card work for desktop and accessibility.
- **Mutual match modal**: When both sides swipe right, a match is created automatically and a modal appears with the relation type and a link to start the conversation.
- **Mode preference persisted**: Switching between Browse and Swipe stays put across visits.

---

## 3 May 2026

### Added
- **In-feed cards**: Three new cards — Get typed (verify your type), Read about your type (opens your Socionics Insight profile in-app), and Shop (type-specific mugs).
- **Dismissible feed cards**: Every in-feed card can be dismissed with a small × in the corner. Stays hidden across visits.

### Changed
- **Type framing**: Your assessed or selected type is now framed as a working hypothesis rather than a final answer.
- **Get typed links**: Links to verify your type appear across the result screen, sign-in page, profile setup, and your own profile when unverified.
- **Support card**: Now opens the full /support page rather than going straight to Ko-fi.

---

## 15 April 2026

### Changed
- **Get typed**: Typing sessions are now free.
- **Support page**: Shop link added. Running costs breakdown removed.

---

## 8 April 2026

### Added
- **Get Typed — Discord sessions**: Book a one-to-one Socionics typing session via Discord voice call. A verified badge is added to your profile on completion. Accessible from the nav for all signed-in members.

---

## 6 April 2026

### Fixed
- **Push notifications**: Fixed a bug where message push notifications were not being delivered to anyone.
- **"Your Dual just joined" notification**: Fixed — was not firing correctly due to the same underlying issue.
- **Stale push subscriptions**: Now automatically cleaned up on the next notification attempt.
- **Multi-device push**: Each device now receives notifications independently.
- **Footer**: Restored on desktop across all pages including Feed, Messages, Profile, and Admin.
- **Message actions**: Reply, edit, and delete buttons are now always visible at reduced opacity on mobile rather than hidden until long-press.

---

## 5 April 2026

### Added
- **Verified type badges**: Members with a professionally verified type show a ✓ on their type badge. Hover to see who verified it. Hidden in anonymous mode.
- **Verified types filter**: New filter in the feed to show only members with verified types.

### Fixed
- **Anonymous mode**: Members without a date of birth set can now save profile changes. Date of birth is now optional.
- **Rate this connection**: Feedback bar moved to the top of the conversation so it no longer overlaps the message input.
- **Help button**: Repositioned consistently across all pages so it no longer overlaps the Send button in messages.

---

## 4 April 2026

### Added
- **Help & FAQ**: A ? button fixed to the bottom right of every page opens a full FAQ covering matching, relations, account settings, safety, and push notification troubleshooting by device.
- **In-app reference sheets**: Tapping a type badge or relation "Learn more →" now opens the Socionics Insight page inside Socion rather than a new tab.
- **Live profile preview**: Profile → Details now shows a live card that updates in real time as you edit.
- **Hide activity status**: New toggle in Profile → Details to stop others seeing when you were last active. You won't appear in Online now or Active today filters while this is on.
- **Member growth chart**: Replaced the bar chart with a line graph with visible data points.

### Changed
- **Onboarding**: A one-line note at the start now tells you that a sign-in step is coming at the end.
- **Admin dashboard**: Sign-ups, connections, and messages now show a +N today delta alongside the total.

---

## 2 April 2026

### Added
- **City field**: Add your city in Profile → Details. Only city is shown, never a postcode or exact location.
- **Location on feed cards**: City appears alongside your country flag.
- **Location filters**: Filter the feed by Anywhere, Same country, or Same city.
- **Share nudge**: Moved from a dismissible banner to a card inline between profiles. Always visible.
- **Filters panel**: Secondary filters (profile, activity, location) are now collapsed behind a single Filters button with a badge count when active.
- **Support page**: socion.app/support explains what the app costs to run and links to Ko-fi. Linked from the footer.
- **Delete last message**: Hover your last sent message to reveal a trash icon. Confirms on second tap. Removes the message for both sides.
- **Edit last message**: Pencil icon appears on your last sent message. Edit inline, Enter to save, Escape to cancel. A "· edited" label appears on the timestamp.

### Changed
- **Sign-in page**: Now shows your type result ("You're an ILI") after completing the quiz so the context carries through to the auth wall.

---

## 31 March 2026

### Added
- **Connect modal**: Character counter counts down to zero as you type. Send & connect unlocks automatically at 10 characters.
- **Network graph — fullscreen**: Available on all devices, not just mobile.
- **Network graph — Spread button**: Resets nodes to a wider circle and restarts the simulation.
- **Network page — join CTA**: Non-logged-in visitors now see a join CTA below the graph.

### Fixed
- **Network graph**: Touch-action disabled on the SVG so dragging nodes on mobile no longer triggers page scroll.
- **Connections — purpose**: Now correctly recorded from your actual profile purpose when you connect, rather than defaulting to Dating.

---

## 30 March 2026

### Added
- **Connect with message**: A message is now required to connect with someone. Write your introduction before the connection is created.
- **Connection question**: Set a custom question in Profile → Details that people see before connecting with you.
- **Anonymous mode**: Hide your name, age, photo, and location. Your type and relation are always visible. Toggle in Profile → Details.
- **Known users only filter**: New feed filter to exclude anonymous profiles.
- **Network page**: socion.app/network plots every connection between member types. Edge thickness shows volume, colour shows average rating.

### Fixed
- **Push notifications**: Multi-device delivery now works correctly across all subscriptions.

### Changed
- **Dynamics page**: Each relation now shows the matching type in brackets, e.g. Dual (ESE).
- **Message box**: Compose area now grows as you type. Shift + Enter inserts a new line, Enter sends.
- **Multi-line messages**: Line breaks in sent messages are now preserved in the conversation view.
- **Rate this connection**: Feedback prompt is now more descriptive, encouraging you to help validate the theory.
- **Date of birth**: Age is now calculated from your date of birth rather than entered manually. Only your age is shown, never your DOB.
- **Privacy policy and terms**: Account self-deletion, push notifications, Google sign-in, and MailerLite all documented.
- **Homepage**: Anonymous mode and push notifications added as feature tiles.

---

## 29 March 2026

### Added
- **Account deletion**: Delete your account permanently from Profile → Details, with a confirmation step. All data, matches, and messages are removed.
- **Admin**: Sign-ups vs members view to track onboarding drop-off; active 7d, inactive 7d+, and messaging 7d stat cards; analytics exclusion toggle to exclude your device from Umami tracking.
- **Discord live-stats**: Three notification types — new sign-up, profile complete, and new connection (with type pair).

### Fixed
- **Sign-in link expired**: If your OTP link expires, your email is pre-filled automatically and a one-tap resend button appears.
- **iOS install prompt**: Now correctly shown only in Safari.
- **Admin**: Mobile layout fixed — stat cards, grids, and padding all responsive on small screens.

### Changed
- **Spread the word**: Share button on the feed opens the native share sheet on mobile or copies the link on desktop.

---

## 28 March 2026

### Added
- **6-digit sign-in code**: Replaced magic links — more secure and works on any device including iPhone PWA.
- **Push notifications**: Get notified instantly when you receive a message on any device.
- **Multi-device push**: Each device subscribes independently; mobile takes priority when both are active.
- **New connection push**: Push notification fires when someone connects with you.
- **Push notification prompt**: Modal appears on first visit to messages explaining the value before asking for permission.
- **Notification settings**: Manage email and push preferences separately in Profile → Notifications.
- **Reply to messages**: Hover on desktop or long-press on mobile to reply with a quote.
- **Typing indicator**: See when the other person is composing a message in real time.
- **Feed activity filters**: Online now, Active today, and Active this week filters added.
- **Online now count**: Shows how many members are active in the last 15 minutes.
- **Admin — country breakdown**: Member breakdown by country.

### Changed
- **Profile pages**: Split into three pages — Details, Dynamics, and Notifications, each with its own save.
- **Email notifications**: Now respect opt-out. Suppressed automatically when push is active on your device.
- **Messages redesign**: Fixed viewport layout on both desktop and mobile, no outer page scroll. Mobile fills the screen edge to edge.
- **Feed activity indicators**: Green for online now, amber for active today, brown for active this week.
- **Feed purpose filtering**: Moved server-side for speed and accuracy.
- **Duplicate match prevention**: Database constraint ensures two users can only connect once.

---

## 27 March 2026

### Added
- **PWA support**: Socion can be installed to your home screen on iOS and Android.
- **Feed filters**: Filter by relation type, active this week, or profiles with photos.
- **Photo modal**: Tap a profile photo to view it full size.
- **Anonymous mode**: Opt in to display a 🔒 badge instead of sharing personal details.
- **Message timestamps and date dividers**: Today, Yesterday, and date labels between conversation days.
- **Admin**: Site-wide member growth chart (cumulative sign-ups by day); site-wide feedback analysis (ratings by relation type with written comments); editable feed announcement (dismissible banner to all users without a deploy).

### Fixed
- **Relation labels in messages**: Now show correctly for asymmetric relations — Supervisor, Supervisee, Benefactor, and Beneficiary display from your perspective.

### Changed
- **Feed**: Filters by compatible types server-side; expanded to show up to 200 profiles (was capped at 20).
- **Last active indicator**: Green dot for profiles active today, gold for active this week.
- **Footer**: Links to GitHub (open source), Socionics reference, and spencerstern.com.

---

## 26 March 2026

### Added
- **Block & report**: Permanent block with reason reporting from any conversation.
- **Cool off**: Pause messaging and feed visibility for 7 days, lifts automatically.
- **Terms of service**: socion.app/terms.
- **Google One Tap**: Sign in or create an account with one click, no email needed.
- **Purpose pills on feed cards**: See at a glance what each person is looking for.
- **Unread message count**: Badge on the Messages nav link; browser tab title updates live.
- **Messages sidebar**: Now shows last message preview and relative timestamp.
- **Type assessment data**: Questionnaire responses recorded for research.

### Fixed
- **Sign out**: No longer flashes the sign-in page before redirecting home.
- **Messaging input**: No longer loses focus when sending or receiving messages.
- **Profile edit page**: Now redirects correctly when not signed in.
- **Messaging page**: No longer hangs if profile data is missing.

### Changed
- **Founder badge**: Displayed on the feed card for the Socion team.
- **Type badges**: Now link to the full type profile on socionicsinsight.com.
- **Relation badges**: Now link to the full relation page on socionicsinsight.com.
- **Long bios**: Now expand inline with a Read more toggle.
- **Gender field**: Added to profiles, displayed alongside name and age on cards.

---

## 25 March 2026 — Launch

- Socion is live at socion.app
- Type onboarding questionnaire — determine your type or bring your own
- Magic link sign-in — no password needed
- Purpose selector — Dating, Friendship, Networking, or Team building
- Matching feed — browse profiles filtered by intertype relation
- 16 named relation types — auditable in the open source matrix
- Profile photos, country flags, bio
- Connect and message — realtime messaging with deep-link support from feed cards
- Post-match feedback — rate connections after 5 messages
- Email notifications for new connections and messages (with cooldown)
- Privacy policy — socion.app/privacy
- Mobile navigation and full-screen conversation view
- Intertype relations matrix corrected — Kindred and Business pairs verified against reference
