/**
 * Height reserved at the bottom of the page while the player bar is visible (plan §7.4). Kept out
 * of PlayerBar.tsx so the layout can use it without loading the bar, which loads on first play.
 */
export const PLAYER_BAR_PADDING = 'pb-16 md:pb-20';
