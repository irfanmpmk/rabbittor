/* Rabbittor — game configuration.
   Tweak numbers here to balance the game. */
var RT = window.RT = window.RT || {};

// Put the young designer's name here so it shows on the title screen.
RT.CREDITS = {
  storyBy: 'Noonu'
};

RT.RABBIT_SPEED = 5.6;        // tiles per second
RT.INVIS_COOLDOWN = 120;      // seconds before invisibility can be used again
RT.FIGHTER_COST = 30;         // carrots needed for one fighter charge
RT.FIGHTER_MAX = 3;           // max stored fighter charges
RT.GOLDEN_POINTS = 150;
RT.BOUNCE_POINTS = 300;
RT.CARROT_POINTS = 10;

/* land = [width, height] used on wide screens, port = used on tall phone screens.
   Width must be odd. Height must be 4k+3 (15, 19, 23, 27, 31, 35, 39 ...). */
RT.DIFFICULTIES = {
  easy: {
    key: 'easy', name: 'Easy', lives: 5,
    land: [21, 15], port: [15, 23],
    enemyDelay: 15, respawnDelay: 8,
    enemySpeed: 0.70, wander: 0.25,
    invisDur: 8, fighterDur: 10,
    braid: 1.0, loops: 0.10, mult: 1,
    mapLabel: 'Small map', blurb: 'Big Mouth is slow and gets confused.'
  },
  normal: {
    key: 'normal', name: 'Normal', lives: 3,
    land: [25, 19], port: [17, 27],
    enemyDelay: 12, respawnDelay: 6,
    enemySpeed: 0.80, wander: 0.12,
    invisDur: 6, fighterDur: 8,
    braid: 1.0, loops: 0.07, mult: 1.5,
    mapLabel: 'Medium map', blurb: 'A fair chase. Watch the corners.'
  },
  hard: {
    key: 'hard', name: 'Hard', lives: 2,
    land: [29, 23], port: [17, 31],
    enemyDelay: 10, respawnDelay: 5,
    enemySpeed: 0.90, wander: 0.05,
    invisDur: 5, fighterDur: 7,
    braid: 0.9, loops: 0.05, mult: 2,
    mapLabel: 'Large map', blurb: 'Fast hunter, some dead ends.'
  },
  extreme: {
    key: 'extreme', name: 'Extreme', lives: 1,
    land: [37, 27], port: [21, 39],
    enemyDelay: 10, respawnDelay: 5,
    enemySpeed: 0.97, wander: 0,
    invisDur: 4, fighterDur: 6,
    braid: 0.8, loops: 0.04, mult: 3,
    mapLabel: 'Huge map', blurb: 'One life. Big Mouth never gives up.'
  }
};
RT.DIFF_ORDER = ['easy', 'normal', 'hard', 'extreme'];
