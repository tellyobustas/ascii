import type { PetMood, PetStage } from "./types";

// Compact ASCII sprites for all stages and moods
// Used for terminal LCD display, mini-games, and text passports

export interface PetSpriteFrame {
  lines: string[];
  emotionGlyph: string;
}

export const EGG_SPRITES: Record<"idle" | "warm" | "crack", string[]> = {
  idle: [
    "      .---.      ",
    "     /     \\     ",
    "    | <0 1> |    ",
    "    |  ::   |    ",
    "     \\     /     ",
    "      '---'      ",
  ],
  warm: [
    "     .*---*.     ",
    "    /   *   \\    ",
    "   | <0 # 1> |   ",
    "   |  :⚡:   |   ",
    "    \\   *   /    ",
    "     *'---'*     ",
  ],
  crack: [
    "     .*---*.     ",
    "    /  / \\  \\    ",
    "   | <0/ \\1> |   ",
    "   |  /:::\\  |   ",
    "    \\/     \\/    ",
    "     *'---'*     ",
  ],
};

export const BABY_SPRITES: Record<PetMood, string[]> = {
  ECSTATIC: [
    "      \\o/      ",
    "     (^_^)     ",
    "    <[▓▓▓]> ♥  ",
    "     /   \\     ",
  ],
  HAPPY: [
    "      ^ ^      ",
    "     (o.o)     ",
    "    <[▒▒▒]>    ",
    "     \"   \"     ",
  ],
  NORMAL: [
    "      - -      ",
    "     (•.•)     ",
    "     [░░░]     ",
    "     /   \\     ",
  ],
  HUNGRY: [
    "      o o      ",
    "     (O.O)     ",
    "     [~~~] ... ",
    "     /   \\     ",
  ],
  DIRTY: [
    "      x x  ~   ",
    "     (-_-)~    ",
    "     [#x#]     ",
    "     /   \\     ",
  ],
  SICK: [
    "      ! !      ",
    "     (x_x) ☠   ",
    "     [ERR]     ",
    "     /   \\     ",
  ],
  SLEEPING: [
    "               ",
    "     (-.-) zZ  ",
    "     [░░░]  z  ",
    "     - - -     ",
  ],
  PANIC: [
    "    ! PANIC !  ",
    "     (X_X)     ",
    "     [0x00]    ",
    "    /!\\ /!\\    ",
  ],
};

export const TEEN_SPRITES: Record<PetMood, string[]> = {
  ECSTATIC: [
    "    /\\   /\\    ",
    "   // \\_/ \\\\   ",
    "  <|  ^ ▽ ^ |> ♥",
    "   | [▓▓▓▓] |  ",
    "   / /   \\ \\   ",
  ],
  HAPPY: [
    "    /\\   /\\    ",
    "   // \\_/ \\\\   ",
    "  <|  o _ o |> ",
    "   | [▒▒▒▒] |  ",
    "    /  |  \\    ",
  ],
  NORMAL: [
    "    /\\   /\\    ",
    "   // \\_/ \\\\   ",
    "  <|  • _ • |> ",
    "   | [░░░░] |  ",
    "     /   \\     ",
  ],
  HUNGRY: [
    "    /\\   /\\    ",
    "   // \\_/ \\\\   ",
    "  <|  O _ O |> ",
    "   | [░░  ] | ? ",
    "     /   \\     ",
  ],
  DIRTY: [
    "    /\\   /\\  ~ ",
    "   // \\_/ \\\\~  ",
    "  <|  - _ - |> ",
    "   | [#BUG] |  ",
    "     /   \\     ",
  ],
  SICK: [
    "    \\/   \\/    ",
    "   // --- \\\\   ",
    "  <|  x _ x |> ☠",
    "   | [WARN] |  ",
    "    \\     /    ",
  ],
  SLEEPING: [
    "    --   --    ",
    "   //     \\\\ zZ",
    "  <|  - _ - |> ",
    "   | [ZZZZ] |  ",
    "    =======    ",
  ],
  PANIC: [
    "   <!>   <!>   ",
    "  <<  KERNEL >>",
    "  <|  X _ X |> ",
    "   | [CRASH]|  ",
    "   /!\\   /!\\   ",
  ],
};

// ASCIILOGRAPH Adult Daemon Sprite (Scaled Compact view)
export const ADULT_SPRITES: Record<PetMood, string[]> = {
  ECSTATIC: [
    "       .---.            .---.       ",
    "      / / \\ \\          / / \\ \\   ♥  ",
    "     | |   | |        | |   | |  ♥  ",
    "   __| |___| |________| |___| |__   ",
    "  /  ASCIILOGRAPH CORE DAEMON   \\  ",
    " |     <[ ⚡ ^ ▽ ^ ⚡ ]>         | ",
    " |       ░▒▓██████▓▒░            | ",
    "  \\       \\______/              /  ",
    "   `---------------------------'    ",
  ],
  HAPPY: [
    "       .---.            .---.       ",
    "      / / \\ \\          / / \\ \\      ",
    "     | |   | |        | |   | |     ",
    "   __| |___| |________| |___| |__   ",
    "  /  ASCIILOGRAPH CORE DAEMON   \\  ",
    " |     <[ • ─── • ]>             | ",
    " |       ░▒▓██████▓▒░            | ",
    "  \\       \\______/              /  ",
    "   `---------------------------'    ",
  ],
  NORMAL: [
    "       .---.            .---.       ",
    "      / / \\ \\          / / \\ \\      ",
    "     | |   | |        | |   | |     ",
    "   __| |___| |________| |___| |__   ",
    "  /  ASCIILOGRAPH CORE DAEMON   \\  ",
    " |     <[ 0 ─── 0 ]>             | ",
    " |       ░▒▓██████▓▒░            | ",
    "  \\       |======|              /  ",
    "   `---------------------------'    ",
  ],
  HUNGRY: [
    "       .---.            .---.       ",
    "      / / \\ \\          / / \\ \\   ?  ",
    "     | |   | |        | |   | |  ?  ",
    "   __| |___| |________| |___| |__   ",
    "  /  ASCIILOGRAPH CORE DAEMON   \\  ",
    " |     <[ O ─── O ]>  [FEED ME]  | ",
    " |       ░░░░░░░░░░░░            | ",
    "  \\       \\  O  /               /  ",
    "   `---------------------------'    ",
  ],
  DIRTY: [
    "       .---.  ~         .---.       ",
    "      / / \\ \\  ~       / / \\ \\   ~  ",
    "     | |   | |        | |   | |     ",
    "   __| |___| |________| |___| |__   ",
    "  /  ASCIILOGRAPH [DIRTY]       \\  ",
    " |     <[ - ─── - ]>  <#_#>      | ",
    " |       ░▒#BUG#▒░               | ",
    "  \\       |~~~~~~|              /  ",
    "   `---------------------------'    ",
  ],
  SICK: [
    "       .---.            .---.       ",
    "      / / \\ \\          / / \\ \\   ☠  ",
    "     | |   | |        | |   | |     ",
    "   __| |___| |________| |___| |__   ",
    "  /  SYSTEM INTEGRITY CRITICAL  \\  ",
    " |     <[ x ─── x ]>  [CORRUPT]  | ",
    " |       !░▒▓ERR▓▒░!             | ",
    "  \\       |XXXXXX|              /  ",
    "   `---------------------------'    ",
  ],
  SLEEPING: [
    "       .---.            .---.    zZ ",
    "      /     \\          /     \\  z   ",
    "     |       |        |       |     ",
    "   __|_______|________|_______|__   ",
    "  /  HIBERNATION MODE ACTIVE    \\  ",
    " |     <[ ─ ─── ─ ]>   z Z Z     | ",
    " |       ░░░░░░░░░░░░            | ",
    "  \\       |------|              /  ",
    "   `---------------------------'    ",
  ],
  PANIC: [
    "   <[ KERNEL PANIC 0x0000DEAD ]>    ",
    "      / / \\ \\          / / \\ \\   !! ",
    "     |X|   |X|        |X|   |X|     ",
    "   __| |___| |________| |___| |__   ",
    "  /  !!! SYSTEM CRASH DETECTED !!! \\",
    " |     <[ X ─── X ]>  [REBOOT]   | ",
    " |       ████████████            | ",
    "  \\       /######\\              /  ",
    "   `---------------------------'    ",
  ],
};

// ASCENDED / OVERCLOCK DEITY SPRITES
export const OVERCLOCK_SPRITES: Record<PetMood, string[]> = {
  ECSTATIC: [
    "  *  /\\    *   ⚡ ASCENDED ⚡   *    /\\  * ",
    " <==//\\\\=======================//\\\\==>",
    "    ||  \\\\    <[ ✦ ^ ▽ ^ ✦ ]>   //  ||    ",
    "    ||   \\\\  ░▒▓████████▓▒░   //   ||  ♥ ",
    "   <==\\//========================\\//==>  ",
    "       \\/         OVERCLOCK       \\/     ",
  ],
  HAPPY: [
    "  *  /\\    *   ⚡ ASCENDED ⚡   *    /\\  * ",
    " <==//\\\\=======================//\\\\==>",
    "    ||  \\\\    <[ ✦ • ── • ✦ ]>  //  ||    ",
    "    ||   \\\\  ░▒▓████████▓▒░   //   ||    ",
    "   <==\\//========================\\//==>  ",
    "       \\/         OVERCLOCK       \\/     ",
  ],
  NORMAL: [
    "     /\\        ⚡ ASCENDED ⚡        /\\    ",
    " <==//\\\\=======================//\\\\==>",
    "    ||  \\\\    <[ ✦ 0 ── 0 ✦ ]>  //  ||    ",
    "    ||   \\\\  ░▒▓████████▓▒░   //   ||    ",
    "   <==\\//========================\\//==>  ",
    "       \\/         OVERCLOCK       \\/     ",
  ],
  HUNGRY: [
    "     /\\        ⚡ LOW CHARGE ⚡     /\\    ",
    " <==//\\\\=======================//\\\\==>",
    "    ||  \\\\    <[ ✦ O ── O ✦ ]>  //  || ?  ",
    "    ||   \\\\  ░░░░░░░░░░░░░░   //   ||    ",
    "   <==\\//========================\\//==>  ",
    "       \\/         OVERCLOCK       \\/     ",
  ],
  DIRTY: [
    "     /\\    ~   ⚡ BUFFER CORRUPT ⚡ /\\    ",
    " <==//\\\\=======================//\\\\==>",
    "    ||  \\\\    <[ ✦ - ── - ✦ ]>  //  || ~  ",
    "    ||   \\\\  ░▒#CACHE#▒░      //   ||    ",
    "   <==\\//========================\\//==>  ",
    "       \\/         OVERCLOCK       \\/     ",
  ],
  SICK: [
    "     \\/        ☠ VIRUS THREAT ☠     \\/    ",
    " <==\\\\//=======================\\\\//==>",
    "    ||  //    <[ ✦ x ── x ✦ ]>  \\\\  || ☠  ",
    "    ||   //  !░▒▓ERR▓▒░!      \\\\   ||    ",
    "   <==/\\\\========================/\\\\==>  ",
    "       /\\         OVERCLOCK       /\\     ",
  ],
  SLEEPING: [
    "               - HIBERNATING -        zZ ",
    " <===================================>  ",
    "    ||        <[ ─ ── ─ ]>          || z ",
    "    ||       ░░░░░░░░░░░░░░         ||   ",
    " <===================================>  ",
    "                  STANDBY                ",
  ],
  PANIC: [
    "  ! ! ! CRITICAL CORE COLLAPSE ! ! !    ",
    " <==XX===========================XX==>",
    "    ||  \\\\    <[ ☠ X ── X ☠ ]>  //  || !! ",
    "    ||   \\\\  ██████████████   //   ||    ",
    "   <==\\//========================\\//==>  ",
    "       \\/       REBOOT NEEDED     \\/     ",
  ],
};

// ASCII Poop / Bug worms that clutter the screen when cleanliness is low
export const JUNK_BUGS = [
  " [x_x] ",
  "<~BUG~>",
  " [404] ",
  "{!ERR!}",
];

export function getPetSprite(stage: PetStage, mood: PetMood, eggWarmCount = 0): string[] {
  if (stage === "EGG") {
    if (eggWarmCount >= 5) return EGG_SPRITES.crack;
    if (eggWarmCount >= 2) return EGG_SPRITES.warm;
    return EGG_SPRITES.idle;
  }
  if (stage === "BABY") {
    return BABY_SPRITES[mood] ?? BABY_SPRITES.NORMAL;
  }
  if (stage === "TEEN") {
    return TEEN_SPRITES[mood] ?? TEEN_SPRITES.NORMAL;
  }
  if (stage === "OVERCLOCK") {
    return OVERCLOCK_SPRITES[mood] ?? OVERCLOCK_SPRITES.NORMAL;
  }
  return ADULT_SPRITES[mood] ?? ADULT_SPRITES.NORMAL;
}
