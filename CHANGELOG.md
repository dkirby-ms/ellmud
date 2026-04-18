# [0.2.0-dev.58](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.57...v0.2.0-dev.58) (2026-04-18)


### Features

* **combat:** multi-encounter support — Phase 1 core refactor ([#475](https://github.com/dkirby-ms/ellmud/issues/475)) ([249f596](https://github.com/dkirby-ms/ellmud/commit/249f59649e76290b56a31ebb165bd6f45c6baa15)), closes [#474](https://github.com/dkirby-ms/ellmud/issues/474)

# [0.2.0-dev.57](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.56...v0.2.0-dev.57) (2026-04-18)


### Bug Fixes

* handle disconnect-while-downed — eliminate ghost entities and preserve bleed-out ([7f26048](https://github.com/dkirby-ms/ellmud/commit/7f2604864ec269afdfe0dd10c27dbd3ce432e388))
* restore downed state on reconnect + broadcast on leave cleanup ([f2cc440](https://github.com/dkirby-ms/ellmud/commit/f2cc4406b10d95461246e79dae42998753bc7ed1))

# [0.2.0-dev.56](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.55...v0.2.0-dev.56) (2026-04-18)


### Bug Fixes

* address PR [#473](https://github.com/dkirby-ms/ellmud/issues/473) review — remove cast, hoist query, dedupe type ([fae4519](https://github.com/dkirby-ms/ellmud/commit/fae45195253bed269d5d0bfb50e786f01f0cd387))
* clear HP cache on player defeat + fix test expectations ([#471](https://github.com/dkirby-ms/ellmud/issues/471)) ([4ff3772](https://github.com/dkirby-ms/ellmud/commit/4ff3772478080435b64c7f8cdc4b9004b21aaa16))
* **client:** resolve combat state consistency bugs ([#471](https://github.com/dkirby-ms/ellmud/issues/471)) ([8d6c2c0](https://github.com/dkirby-ms/ellmud/commit/8d6c2c0cce118b67a8c1d26428dd413044f1602e))
* **combat:** persist player HP between encounters and send terminal COMBAT_STATE ([#471](https://github.com/dkirby-ms/ellmud/issues/471)) ([bb75839](https://github.com/dkirby-ms/ellmud/commit/bb7583953beef2d17ccce8c47b0ccbe040401966))
* update PgCharacterRepository test mock for loadout query ([9a6a10e](https://github.com/dkirby-ms/ellmud/commit/9a6a10e9ca49670ca3edd21c1fcf0f1c6c85d1de))


### Features

* **client:** redesign character select with detail panel in right pane ([7fc6e87](https://github.com/dkirby-ms/ellmud/commit/7fc6e8786a5e7c624cb48a85a4b5b89bfbfcab4a))
* extend CharacterSummary with baseStats, equipment, and statPointsAvailable ([4f23401](https://github.com/dkirby-ms/ellmud/commit/4f23401f8952f8078bf72b7227a2b755e5a1e4c6))

# [0.2.0-dev.55](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.54...v0.2.0-dev.55) (2026-04-17)


### Features

* COMBAT_STATE message + CombatHUD wiring ([#467](https://github.com/dkirby-ms/ellmud/issues/467)) ([9b7a2a6](https://github.com/dkirby-ms/ellmud/commit/9b7a2a6b68ccaa7b5e78af29860a9cc7568666f1))

# [0.2.0-dev.54](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.53...v0.2.0-dev.54) (2026-04-17)


### Features

* add combat intro message and round separators ([4b1c31a](https://github.com/dkirby-ms/ellmud/commit/4b1c31a974362a2ef6c0dac3e5ec90aeacb33e55))

# [0.2.0-dev.53](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.52...v0.2.0-dev.53) (2026-04-16)


### Bug Fixes

* suppress phantom ↑/↓ badges on inter-floor ghost rooms and zero-length edges ([0c13307](https://github.com/dkirby-ms/ellmud/commit/0c133077a664c998fa230aba7424d34213cabfc5))

# [0.2.0-dev.52](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.51...v0.2.0-dev.52) (2026-04-16)


### Bug Fixes

* remove duplicate down arrow from minimap inter-floor edges ([#463](https://github.com/dkirby-ms/ellmud/issues/463)) ([#466](https://github.com/dkirby-ms/ellmud/issues/466)) ([810bc61](https://github.com/dkirby-ms/ellmud/commit/810bc617e40307694387aa3fc28546faf982b9ae))

# [0.2.0-dev.51](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.50...v0.2.0-dev.51) (2026-04-16)


### Bug Fixes

* harden death-spawn-routing tests against silent passes ([3afe7c9](https://github.com/dkirby-ms/ellmud/commit/3afe7c9253865be7e66906c3e5f390e32fe9dfff))

# [0.2.0-dev.50](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.49...v0.2.0-dev.50) (2026-04-16)


### Bug Fixes

* resolve CI flake in death-penalty test (async timing) ([131f6a5](https://github.com/dkirby-ms/ellmud/commit/131f6a5316cc21e94c96c0f5034bfbece0ed7c42))

# [0.2.0-dev.49](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.48...v0.2.0-dev.49) (2026-04-16)


### Bug Fixes

* reorder semantic-release plugins so version:sync runs after npm bumps root ([83cde67](https://github.com/dkirby-ms/ellmud/commit/83cde678de8c90cbcc86b5a63d72dc5c2b735886))

# [0.2.0-dev.48](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.47...v0.2.0-dev.48) (2026-04-16)


### Features

* **ci:** improve UAT Discord notification with embed, changelog, and test site link ([f3bb156](https://github.com/dkirby-ms/ellmud/commit/f3bb15618269eb71aa6f32d5e5828c8b622f5aa1))
* stat training & progression system ([#457](https://github.com/dkirby-ms/ellmud/issues/457)) ([#464](https://github.com/dkirby-ms/ellmud/issues/464)) ([07a8ee7](https://github.com/dkirby-ms/ellmud/commit/07a8ee7eb010ee83d3c433fbad9639ef9ae7f4d6))

# [0.2.0-dev.47](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.46...v0.2.0-dev.47) (2026-04-15)


### Bug Fixes

* Docker husky failure + issue-creation on workflow_dispatch ([824cd3c](https://github.com/dkirby-ms/ellmud/commit/824cd3cadee463fea83f7ac7850f257998414ffd))

# [0.2.0-dev.46](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.45...v0.2.0-dev.46) (2026-04-15)


### Bug Fixes

* use currentRoomId instead of roomId on Creature type ([4a37cde](https://github.com/dkirby-ms/ellmud/commit/4a37cdeabf50c941e1c8e702e2ef9611bcfbd591))

# [0.2.0-dev.45](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.44...v0.2.0-dev.45) (2026-04-15)


### Bug Fixes

* TS errors in death tests + CI failure-issue job condition ([8aaea81](https://github.com/dkirby-ms/ellmud/commit/8aaea81e2492db8408e65fea2f324a968f319248))

# [0.2.0-dev.44](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.43...v0.2.0-dev.44) (2026-04-14)


### Bug Fixes

* only send bleed-out HP messages when HP actually changes ([26bc471](https://github.com/dkirby-ms/ellmud/commit/26bc471366d975c961223cceec3271d01777e0c8))

# [0.2.0-dev.43](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.42...v0.2.0-dev.43) (2026-04-14)


### Bug Fixes

* bleed-out dies at -10 HP and slow down combat pacing ([b884eeb](https://github.com/dkirby-ms/ellmud/commit/b884eebd4a40c65b058b4919285d6946c9b4f80b))
* send bleed-out HP drain to downed players with scroll log prompt ([269153a](https://github.com/dkirby-ms/ellmud/commit/269153ab61f0f3f2ac5cf20a37f1e7d19feade9d))


### Reverts

* remove browser timeout/proxy changes that caused Firefox blank screen ([1a2782d](https://github.com/dkirby-ms/ellmud/commit/1a2782df85ed116c9d70f562fee0fba92f889879))

# [0.2.0-dev.42](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.41...v0.2.0-dev.42) (2026-04-14)


### Bug Fixes

* **combat:** send 0 HP state when player enters downed state ([81989ad](https://github.com/dkirby-ms/ellmud/commit/81989ade92b15478f7d5a239e933aac8cbf0a9ef))

# [0.2.0-dev.41](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.40...v0.2.0-dev.41) (2026-04-14)


### Bug Fixes

* **combat:** prevent post-death combat bleed with pendingDeathTeleport guard ([357f68f](https://github.com/dkirby-ms/ellmud/commit/357f68ff73ff45607e311c707c4db353e3abd9f0))

# [0.2.0-dev.40](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.39...v0.2.0-dev.40) (2026-04-14)


### Bug Fixes

* resolve 6 combat bugs from live playtesting ([e05231d](https://github.com/dkirby-ms/ellmud/commit/e05231d97c5c2e5810c7907f1f0df6c1a6c6fa22))

# [0.2.0-dev.39](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.38...v0.2.0-dev.39) (2026-04-14)


### Bug Fixes

* **combat:** make flee instant — skip defeated, move creatures ([73418a8](https://github.com/dkirby-ms/ellmud/commit/73418a8c63dd7d0b99e3e6adbe4b9589fabc57c3))

# [0.2.0-dev.38](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.37...v0.2.0-dev.38) (2026-04-14)


### Features

* **downing:** extend bleed-out to 60 ticks (~1 minute) ([b1f4574](https://github.com/dkirby-ms/ellmud/commit/b1f4574bb5f20e6b66ae3986df51a46590383896))
* rework downed state with grace period, HP drain, and stabilize-revive ([feb8326](https://github.com/dkirby-ms/ellmud/commit/feb83264bb05461abb1a69ef0d3c8e51d36dc43c))

# [0.2.0-dev.37](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.36...v0.2.0-dev.37) (2026-04-14)


### Bug Fixes

* make player-death integration test deterministic ([d5b93ad](https://github.com/dkirby-ms/ellmud/commit/d5b93ad7258cc135c0e0c7cbc06b4109fa22fede))

# [0.2.0-dev.36](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.35...v0.2.0-dev.36) (2026-04-14)


### Bug Fixes

* improve dodge and block narration to include attacker name ([694a844](https://github.com/dkirby-ms/ellmud/commit/694a844e639052b808cf21fae935b72d0233b1e7))

# [0.2.0-dev.35](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.34...v0.2.0-dev.35) (2026-04-14)


### Bug Fixes

* build errors in combat tests + connection timeout for browser hang ([9fef3f5](https://github.com/dkirby-ms/ellmud/commit/9fef3f503ad99d210afccf5c9f2b1751e1276ad5))

# [0.2.0-dev.34](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.33...v0.2.0-dev.34) (2026-04-14)


### Bug Fixes

* add timeout to API calls and Vite proxy to prevent browser hang on server restart ([a6c804b](https://github.com/dkirby-ms/ellmud/commit/a6c804bc71bf5eaa125290d14b1609162759960f))

# [0.2.0-dev.33](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.32...v0.2.0-dev.33) (2026-04-14)


### Bug Fixes

* dodge rolls, respawn location, and post-death combat cleanup (fixes [#460](https://github.com/dkirby-ms/ellmud/issues/460), fixes [#461](https://github.com/dkirby-ms/ellmud/issues/461), fixes [#462](https://github.com/dkirby-ms/ellmud/issues/462)) ([4d1899b](https://github.com/dkirby-ms/ellmud/commit/4d1899be2b33e24dfeeb9d38f99548b0eb1a7264))

# [0.2.0-dev.32](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.31...v0.2.0-dev.32) (2026-04-14)


### Features

* replace color name buttons with compact swatch grid in ANSI toolbar (fixes [#458](https://github.com/dkirby-ms/ellmud/issues/458)) ([f97312f](https://github.com/dkirby-ms/ellmud/commit/f97312f9d0bdd9fa1642b7e108f8c0abb0c72b82))

# [0.2.0-dev.31](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.30...v0.2.0-dev.31) (2026-04-14)


### Bug Fixes

* add Laeral, Bruenor, Danilo to Issue Routing table in routing.md ([64d1352](https://github.com/dkirby-ms/ellmud/commit/64d13521b8307eda75dd5c65e7c48fadbc732800))

# [0.2.0-dev.30](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.29...v0.2.0-dev.30) (2026-04-14)


### Bug Fixes

* move Discord UAT announcement to fire after successful deploy (fixes [#451](https://github.com/dkirby-ms/ellmud/issues/451)) ([e39b67f](https://github.com/dkirby-ms/ellmud/commit/e39b67f48cc0413f31efe8c1d0b67a16849d85d0))
* replace hardcoded triage routing with routing.md-driven keyword scoring ([1b2cbe9](https://github.com/dkirby-ms/ellmud/commit/1b2cbe9391ae49b7e07107f063b711bee9446b08))

# [0.2.0-dev.29](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.28...v0.2.0-dev.29) (2026-04-14)


### Bug Fixes

* inventory panel shows carried items when in zone ([1099162](https://github.com/dkirby-ms/ellmud/commit/1099162539ec6f2b32b6dc43376edaf5277f6bb7))
* migrate admin creature CRUD to Phase 1 stats, wire calculateCreatureEffectiveStats ([#452](https://github.com/dkirby-ms/ellmud/issues/452), [#456](https://github.com/dkirby-ms/ellmud/issues/456)) ([2a97cf1](https://github.com/dkirby-ms/ellmud/commit/2a97cf174f332fe945a1433714007e59ea0341ff))
* update 15 test files for new combat stat model ([159f1bb](https://github.com/dkirby-ms/ellmud/commit/159f1bb52bb406391d1e00d337b5b2fffee9d50c))
* update message type count for EFFECTIVE_STATS addition ([3401c1e](https://github.com/dkirby-ms/ellmud/commit/3401c1e11e44017078010c393d3b632740d23bf7))
* update test expectations for passive dodge refactor ([41531c5](https://github.com/dkirby-ms/ellmud/commit/41531c584a59fbf937d987f5832c04c8844b4584))
* wire player combat stats from CharacterRepository into combatant creation ([c2c134d](https://github.com/dkirby-ms/ellmud/commit/c2c134dcedd98e4788fdb8bf10fc9dae89c6f320))


### Features

* add ItemStats to Item interface for equipment bonuses ([#453](https://github.com/dkirby-ms/ellmud/issues/453)) ([3436dc3](https://github.com/dkirby-ms/ellmud/commit/3436dc3b33f1d5cb929f4c66b7ec40910ab2095c))
* send effective stats to client and display in StatusPanel ([#455](https://github.com/dkirby-ms/ellmud/issues/455)) ([d3fbb2d](https://github.com/dkirby-ms/ellmud/commit/d3fbb2dc5dd8d6b2fc0d1cae9dc2e21c3f9e42ec))

# [0.2.0-dev.28](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.27...v0.2.0-dev.28) (2026-04-13)


### Features

* add permadeath system with character reset and Hall of Fame ([68c34c8](https://github.com/dkirby-ms/ellmud/commit/68c34c8ed1045983c9aedc70ac5c457d0206315d))

# [0.2.0-dev.27](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.26...v0.2.0-dev.27) (2026-04-13)


### Bug Fixes

* **admin:** remove Rooms from admin left-nav menu ([10c8651](https://github.com/dkirby-ms/ellmud/commit/10c8651f8c814eb085e38d1072f6f497d10680da))

# [0.2.0-dev.26](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.25...v0.2.0-dev.26) (2026-04-13)


### Bug Fixes

* clean up stale combatant entries to prevent cross-room combat failures ([7fa5498](https://github.com/dkirby-ms/ellmud/commit/7fa54980049d29ca195ffbc3d8916638124a49ba))

# [0.2.0-dev.25](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.24...v0.2.0-dev.25) (2026-04-13)


### Bug Fixes

* **admin:** guard null behavior in creature editor select ([606d0f9](https://github.com/dkirby-ms/ellmud/commit/606d0f9aa453376acf4a84c6a0c2d380616c1f61))

# [0.2.0-dev.24](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.23...v0.2.0-dev.24) (2026-04-13)


### Bug Fixes

* **client:** exclude all __tests__ dirs from tsc type-checking ([c588eab](https://github.com/dkirby-ms/ellmud/commit/c588eab6608771b26041770ee070c19783f21747))

# [0.2.0-dev.23](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.22...v0.2.0-dev.23) (2026-04-13)


### Bug Fixes

* align creature reroll endpoint with flat entity shape from store ([be5d8aa](https://github.com/dkirby-ms/ellmud/commit/be5d8aa421bc13c0c01cca7f177b1b8633aebf79))


### Features

* **admin:** add undo/redo support for AnsiToolbar color toggles ([7c5c583](https://github.com/dkirby-ms/ellmud/commit/7c5c583ddc1176ba5315b9c7da2efd456fa9c7fa))

# [0.2.0-dev.22](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.21...v0.2.0-dev.22) (2026-04-13)


### Features

* add noTake flag to Item interface for non-carryable items ([1677ac8](https://github.com/dkirby-ms/ellmud/commit/1677ac8af0aa61bf5d12dca976be9156b5467384))

# [0.2.0-dev.21](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.20...v0.2.0-dev.21) (2026-04-13)


### Bug Fixes

* remove false confidence from test suite ([#450](https://github.com/dkirby-ms/ellmud/issues/450)) ([2d5e47c](https://github.com/dkirby-ms/ellmud/commit/2d5e47c8bcf18b8875ac735a81e7819a97eed7e3))

# [0.2.0-dev.20](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.19...v0.2.0-dev.20) (2026-04-13)


### Bug Fixes

* remove unused imports in corpse test files ([3acc43a](https://github.com/dkirby-ms/ellmud/commit/3acc43a230f202c45eecfc75c200ce218fa7bdca))

# [0.2.0-dev.19](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.18...v0.2.0-dev.19) (2026-04-13)


### Features

* ANSI formatting toolbar for admin content editors ([#449](https://github.com/dkirby-ms/ellmud/issues/449)) ([c59fc81](https://github.com/dkirby-ms/ellmud/commit/c59fc810c8e743c1d31de06738776def83a1938e)), closes [#448](https://github.com/dkirby-ms/ellmud/issues/448) [#447](https://github.com/dkirby-ms/ellmud/issues/447) [#448](https://github.com/dkirby-ms/ellmud/issues/448) [#445](https://github.com/dkirby-ms/ellmud/issues/445)

# [0.2.0-dev.18](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.17...v0.2.0-dev.18) (2026-04-13)


### Bug Fixes

* creature detail static panels — preview, re-roll, version history ([#446](https://github.com/dkirby-ms/ellmud/issues/446)) ([9a2994b](https://github.com/dkirby-ms/ellmud/commit/9a2994b276255bc931368716db0789da00527200))
* zone designer exit icons + publish refactor ([#445](https://github.com/dkirby-ms/ellmud/issues/445)) ([c6914bd](https://github.com/dkirby-ms/ellmud/commit/c6914bdb4721373e0468347519db05b7466f780b))

# [0.2.0-dev.17](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.16...v0.2.0-dev.17) (2026-04-12)


### Bug Fixes

* minimap rendering with progressive exploration ([#443](https://github.com/dkirby-ms/ellmud/issues/443)) ([cd787d1](https://github.com/dkirby-ms/ellmud/commit/cd787d164c25d906a0280358160cbd07ead6690f))

# [0.2.0-dev.16](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.15...v0.2.0-dev.16) (2026-04-12)


### Features

* unified corpse container system ([#442](https://github.com/dkirby-ms/ellmud/issues/442)) ([c6169ac](https://github.com/dkirby-ms/ellmud/commit/c6169ac35e5dfba15c18af2fd7b97241d59585e0))

# [0.2.0-dev.15](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.14...v0.2.0-dev.15) (2026-04-12)


### Bug Fixes

* resolve all ESLint errors (0 errors remaining) ([a6fd0e1](https://github.com/dkirby-ms/ellmud/commit/a6fd0e1f28536a5f15c853f2a2399f1bc0b45268))

# [0.2.0-dev.14](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.13...v0.2.0-dev.14) (2026-04-12)


### Features

* rename loot_containers → starting_items, remove collapse lifecycle, drop room_definitions ([#438](https://github.com/dkirby-ms/ellmud/issues/438)) ([#439](https://github.com/dkirby-ms/ellmud/issues/439)) ([b6e2782](https://github.com/dkirby-ms/ellmud/commit/b6e278286ae021e091803d6601a3df31440a2af5))

# [0.2.0-dev.13](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.12...v0.2.0-dev.13) (2026-04-12)


### Bug Fixes

* replace Math.random() with crypto in E2E test fixtures ([83cdfdc](https://github.com/dkirby-ms/ellmud/commit/83cdfdca65b750d4b172adc92ae2824391903869)), closes [#19](https://github.com/dkirby-ms/ellmud/issues/19) [#19](https://github.com/dkirby-ms/ellmud/issues/19)

# [0.2.0-dev.12](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.11...v0.2.0-dev.12) (2026-04-12)


### Bug Fixes

* **toggle:** report actual new state when toggling settings ([#432](https://github.com/dkirby-ms/ellmud/issues/432)) ([03a237f](https://github.com/dkirby-ms/ellmud/commit/03a237f96d264a78a79eebf2f0712559249daad4))

# [0.2.0-dev.11](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.10...v0.2.0-dev.11) (2026-04-12)


### Bug Fixes

* use correct inventory/stash headers based on zone context ([#431](https://github.com/dkirby-ms/ellmud/issues/431)) ([d00eb6a](https://github.com/dkirby-ms/ellmud/commit/d00eb6a1d58b5f1ec814e59557df399d461008fa))

# [0.2.0-dev.10](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.9...v0.2.0-dev.10) (2026-04-12)


### Bug Fixes

* resolve CodeQL security alerts — sanitization, ReDoS, rate limiting ([#433](https://github.com/dkirby-ms/ellmud/issues/433)) ([aa9ead5](https://github.com/dkirby-ms/ellmud/commit/aa9ead57e0852e6d210e6b0531b5a78d521fe3f2)), closes [#419](https://github.com/dkirby-ms/ellmud/issues/419) [#419](https://github.com/dkirby-ms/ellmud/issues/419)

# [0.2.0-dev.9](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.8...v0.2.0-dev.9) (2026-04-12)


### Bug Fixes

* handle forbidden-path conflicts in uat→prod merge ([a52b2dd](https://github.com/dkirby-ms/ellmud/commit/a52b2dddf40c826d2bd89485bf08a4fb9680f775))
* use -X theirs for uat→prod merge in squad-promote ([17d6312](https://github.com/dkirby-ms/ellmud/commit/17d6312848ae81f1015cdee3eb7f10f92ac16da5))

# [0.2.0-dev.8](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.7...v0.2.0-dev.8) (2026-04-12)


### Bug Fixes

* handle [reset] ANSI tag and simplify squad-promote workflow ([7fa7802](https://github.com/dkirby-ms/ellmud/commit/7fa780271353d07773a110a6f83a1b78cbbd1e60))

# [0.2.0-dev.7](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.6...v0.2.0-dev.7) (2026-04-12)


### Bug Fixes

* allow deploy on workflow_dispatch events ([e6064e7](https://github.com/dkirby-ms/ellmud/commit/e6064e780c3b3807550e31f7dc33865f2e643498))

# [0.2.0-dev.6](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.5...v0.2.0-dev.6) (2026-04-12)


### Bug Fixes

* exclude E2E tests from CI test step ([9b3a741](https://github.com/dkirby-ms/ellmud/commit/9b3a741b16f465ac3536dc34d89e87663fa03e47))

# [0.2.0-dev.5](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.4...v0.2.0-dev.5) (2026-04-12)


### Bug Fixes

* **client:** resolve dual-React version mismatch in tests ([1476b8c](https://github.com/dkirby-ms/ellmud/commit/1476b8cfea8933442fc5ef9cc98a95333a43b64a))
* **e2e:** fresh server per test + fix admin API room name ([243d6f4](https://github.com/dkirby-ms/ellmud/commit/243d6f4c13ef6c9e47b5c1d5ddf2e9f716433f61))

# [0.2.0-dev.4](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.3...v0.2.0-dev.4) (2026-04-11)


### Bug Fixes

* **e2e:** use admin spawn API for container tests ([e9304e2](https://github.com/dkirby-ms/ellmud/commit/e9304e2859588b5665bd8d1327f287391d7cf277))

# [0.2.0-dev.3](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.2...v0.2.0-dev.3) (2026-04-11)


### Bug Fixes

* complete test fixes for static registry removal ([8fc0ba2](https://github.com/dkirby-ms/ellmud/commit/8fc0ba263f6745bb81f8d4a002b0394d80eaaa79))
* resolve test failures from registry removal + help modal refactor ([3c96b57](https://github.com/dkirby-ms/ellmud/commit/3c96b578921582498f96d5fa77aaaeff8af77c7b))


### Features

* help modal overlay with structured data from server ([6eb21b0](https://github.com/dkirby-ms/ellmud/commit/6eb21b0ecd4d5a3f064bd00f59acab0fc362599a))

# [0.2.0-dev.2](https://github.com/dkirby-ms/ellmud/compare/v0.2.0-dev.1...v0.2.0-dev.2) (2026-04-11)


### Features

* add 6 new container items across all tiers ([1e3367c](https://github.com/dkirby-ms/ellmud/commit/1e3367c6f6555fda4a64275d860b73b042839e85))

# [0.2.0-dev.1](https://github.com/dkirby-ms/ellmud/compare/v0.1.1-dev.2...v0.2.0-dev.1) (2026-04-11)


### Features

* add ANSI tag support for item and creature displays ([936b0bc](https://github.com/dkirby-ms/ellmud/commit/936b0bc108ff48c4d56b561afd9dc1b31602491b)), closes [#418](https://github.com/dkirby-ms/ellmud/issues/418)

## [0.1.1-dev.2](https://github.com/dkirby-ms/ellmud/compare/v0.1.1-dev.1...v0.1.1-dev.2) (2026-04-11)


### Bug Fixes

* filter npm-internal vulnerabilities from CI audit step ([7783b30](https://github.com/dkirby-ms/ellmud/commit/7783b30548eebfc59908de74783f6a526eb9ba52))

## [0.1.1-dev.1](https://github.com/dkirby-ms/ellmud/compare/v0.1.0...v0.1.1-dev.1) (2026-04-11)


### Bug Fixes

* **ci:** standardize action refs and replace merge error swallowing ([921359c](https://github.com/dkirby-ms/ellmud/commit/921359cbea65769ba21d90db3c92c17496f43ef0))
* limit GitHub Releases to production branch only ([2089600](https://github.com/dkirby-ms/ellmud/commit/20896006a174bf0e81df37e1318302b48b02b091))

# 0.1.0-dev.1 (2026-04-11)


### Bug Fixes

* add 'enter' to KNOWN_VERBS so Refuge→Shard works ([9e6dd0d](https://github.com/dkirby-ms/ellmud/commit/9e6dd0d07ba22c04a63b1253df341eef8972108a))
* add /api proxy to Vite dev server config ([270e8bd](https://github.com/dkirby-ms/ellmud/commit/270e8bdaa334b2244bf06ab51ff720e8f86da2b9))
* add actions:write permission to promote workflows ([cb3f63c](https://github.com/dkirby-ms/ellmud/commit/cb3f63c28b098b75d9342f6ad41d43421e5d8bfb))
* add admin token login gate and /admin/api proxy ([ee9e851](https://github.com/dkirby-ms/ellmud/commit/ee9e851a79db469ea3744cf90250bb161718bb74))
* add compass to Refuge and init zone provider at boot ([c1456c7](https://github.com/dkirby-ms/ellmud/commit/c1456c752e570f42b9fb6c187d8968191a0afef6))
* add consent, follow, and group verbs to command parser KNOWN_VERBS ([9501c01](https://github.com/dkirby-ms/ellmud/commit/9501c018575fa267be27484d8d9fbb69ba86e12f))
* add DATABASE_URL and Redis env vars to CI/CD deploy ([4b6fca5](https://github.com/dkirby-ms/ellmud/commit/4b6fca5b7976a6544ac365bbf0bdb4e2f5bffa91))
* add feature_inn to ZoneDesigner room type dropdown ([03beecb](https://github.com/dkirby-ms/ellmud/commit/03beecb49351ba0de651cbe73a5f9eb04f5d15c4))
* add migration 006 for diagonal reroute (005 already applied) ([57967f2](https://github.com/dkirby-ms/ellmud/commit/57967f268afa602353b8bb44cc46c52c71718959))
* add migration for Refuge category update on existing databases ([b70710a](https://github.com/dkirby-ms/ellmud/commit/b70710a53df983b5f521c83e3531fcd765c79ad0))
* add rent, target, position, loadout to KNOWN_VERBS parser allowlist ([d05691b](https://github.com/dkirby-ms/ellmud/commit/d05691b067fe1e906bb2cf7048663fe45171911e))
* admin items reads from item_definitions table ([1eb22a7](https://github.com/dkirby-ms/ellmud/commit/1eb22a788b60cfe7ba429bbc97b938405606df37))
* **admin:** correct player count in live rooms endpoint ([907001a](https://github.com/dkirby-ms/ellmud/commit/907001a5ed878d8e89e24c57d93ce16dba2ce30e))
* **admin:** extract UserStore abstraction to fix CI failures ([#127](https://github.com/dkirby-ms/ellmud/issues/127)) ([#154](https://github.com/dkirby-ms/ellmud/issues/154)) ([a64cc02](https://github.com/dkirby-ms/ellmud/commit/a64cc02abf0fce3f010d34b76665b7db99c95fa3))
* **admin:** safely serialize room createdAt to ISO string ([#388](https://github.com/dkirby-ms/ellmud/issues/388)) ([b233089](https://github.com/dkirby-ms/ellmud/commit/b2330893ceeca857204ebacf478db6096263a7e5))
* **admin:** suppress browser context menu on Live Room detail page ([26152a3](https://github.com/dkirby-ms/ellmud/commit/26152a3a55a467e194057001f8dc49e80efe2c15))
* **admin:** update PgItemDefinitionsStore for renamed stats → base_stats column ([27a3ccd](https://github.com/dkirby-ms/ellmud/commit/27a3ccd3b8e930ed35807779e22f11326a30ad0e))
* **admin:** validate token on input and handle stale tokens ([#369](https://github.com/dkirby-ms/ellmud/issues/369)) ([2a2f33e](https://github.com/dkirby-ms/ellmud/commit/2a2f33ee036006a69099a1b200899b67116e40df))
* align release workflows with dev/uat/prod branching model ([#379](https://github.com/dkirby-ms/ellmud/issues/379)) ([5defc63](https://github.com/dkirby-ms/ellmud/commit/5defc63cef0f374c62c09999bad251d29eeea22b))
* align vitest versions and resolve all ESLint errors ([7e1fe8e](https://github.com/dkirby-ms/ellmud/commit/7e1fe8ef7f42d7851d3e066e63329c736dee5dfc))
* auto-retarget when current target dies in combat (closes [#321](https://github.com/dkirby-ms/ellmud/issues/321)) ([cc2f653](https://github.com/dkirby-ms/ellmud/commit/cc2f653f20b221b38a9ef43215301a94554a5a94))
* build errors — refuge→hub type, settings cast, gitignore scripts ([a018b65](https://github.com/dkirby-ms/ellmud/commit/a018b650af072b3aac74cffcada7b6f206f61a7a))
* bump Node.js to 22 for semantic-release compatibility ([b817e07](https://github.com/dkirby-ms/ellmud/commit/b817e070e14024db8d67872e4a9e15623cb8edca))
* **ci-cd:** accept RunningAtMaxScale as valid revision state ([13df195](https://github.com/dkirby-ms/ellmud/commit/13df1957caca016165074bcb7387df1815fd70b3))
* **ci-cd:** accept RunningAtMaxScale as valid revision state ([30ac041](https://github.com/dkirby-ms/ellmud/commit/30ac041b52d414d9ef9371a93005df7a98464199))
* **ci-cd:** add revision monitoring, remove args workaround ([5a4b464](https://github.com/dkirby-ms/ellmud/commit/5a4b464b52665984e2d6f11c20c201d5224ee7d5))
* **ci-cd:** add revision monitoring, remove args workaround ([3301444](https://github.com/dkirby-ms/ellmud/commit/33014442fd3ec9d00a890463b6a66012c611b729))
* **ci:** clear bootstrap args on ACA deploy, harden health check ([35a60e3](https://github.com/dkirby-ms/ellmud/commit/35a60e3a57a7a53c334ee353184f08a35f95cc2d))
* clear loadout on player death — equipped gear now lost on death ([816372d](https://github.com/dkirby-ms/ellmud/commit/816372dd478c06c0fb70dae5ebd8e12124b98a33))
* clear messages on room switch to prevent shard history blowout ([#113](https://github.com/dkirby-ms/ellmud/issues/113)) ([e232a7a](https://github.com/dkirby-ms/ellmud/commit/e232a7ad9b9500309442304c96569ed55f33dcf1))
* clear messages on room switch to prevent shard history blowout ([#113](https://github.com/dkirby-ms/ellmud/issues/113)) ([#114](https://github.com/dkirby-ms/ellmud/issues/114)) ([c5a0034](https://github.com/dkirby-ms/ellmud/commit/c5a003477a96081246c3c41f92557de25bb1f9cf))
* client test failures — guard scrollTo in jsdom, mock admin auth gate ([605090c](https://github.com/dkirby-ms/ellmud/commit/605090c195c0694b31abaf4aeed15f5a29f19889))
* **client:** add golden highlight to compass on selection ([#361](https://github.com/dkirby-ms/ellmud/issues/361)) ([0396dbc](https://github.com/dkirby-ms/ellmud/commit/0396dbc83b50db2213820152c6f2d78d02d24f2d))
* **client:** add visible golden ring to focused compass buttons ([e06d104](https://github.com/dkirby-ms/ellmud/commit/e06d1047c4340ac141bd83a7ed2f9e7d73433784))
* **client:** add Vite and jest-dom type declarations ([05d5a6d](https://github.com/dkirby-ms/ellmud/commit/05d5a6daea818f5f3249a3edf5cf477ec7e30ee8))
* **client:** address 5 should-fix items from code review ([#102](https://github.com/dkirby-ms/ellmud/issues/102)) ([f9d5933](https://github.com/dkirby-ms/ellmud/commit/f9d5933173163f6da6da3447a020a926c02e76d6))
* **client:** auto-detect ws/wss protocol from page origin ([a12f404](https://github.com/dkirby-ms/ellmud/commit/a12f404a996e0a5f785d4aa721a4f460f5a4c318))
* **client:** auto-scroll stick-to-bottom on rapid room changes ([#382](https://github.com/dkirby-ms/ellmud/issues/382)) ([64a486d](https://github.com/dkirby-ms/ellmud/commit/64a486d491b666d288b294c1d41d358ef6d4e4bc))
* **client:** disable browser context menu across admin and game client ([9395901](https://github.com/dkirby-ms/ellmud/commit/9395901d549a7458180c21de72eea9db8870fd2c))
* **client:** exclude compiled JS from vitest test discovery ([24519ec](https://github.com/dkirby-ms/ellmud/commit/24519ecbcf4569ce0c98d22cffc84339db73da3d))
* **client:** preserve compass focus across zone transitions ([#362](https://github.com/dkirby-ms/ellmud/issues/362)) ([59c1903](https://github.com/dkirby-ms/ellmud/commit/59c19035529bdeb30766390300f2304178a20aaf))
* **client:** preserve newlines in system narrations ([269ef23](https://github.com/dkirby-ms/ellmud/commit/269ef23ac359eb54e8ecffed3ba2b7ea9fb1a4e5))
* **client:** remove deprecated Refuge screen and relocate settings access ([b250520](https://github.com/dkirby-ms/ellmud/commit/b250520230c2d0dad41134aab462c9ed24270825))
* **client:** remove sign-out from zone explorer, add settings to char select ([#363](https://github.com/dkirby-ms/ellmud/issues/363)) ([099cfbc](https://github.com/dkirby-ms/ellmud/commit/099cfbc8867cf22ed125d9cb07ee24034e9ff5a4))
* **client:** render ANSI tags in system and combat narrations ([7ec77a1](https://github.com/dkirby-ms/ellmud/commit/7ec77a10a41187c69bdc902b1f86f1fe629bb45f))
* **client:** Replace hardcoded hex with CSS variables in ShardboardCards ([#87](https://github.com/dkirby-ms/ellmud/issues/87)) ([a1a3ff9](https://github.com/dkirby-ms/ellmud/commit/a1a3ff9d7b6999887144a0a2674272c74ecd290f))
* **client:** Replace hardcoded hex with CSS variables in ShardSidebar/CombatOverlay ([#90](https://github.com/dkirby-ms/ellmud/issues/90)) ([8bcd838](https://github.com/dkirby-ms/ellmud/commit/8bcd8389f988e1b10c9311991cac4f01b1d4c27b))
* **client:** resolve ESLint unused-vars errors ([68a062a](https://github.com/dkirby-ms/ellmud/commit/68a062ae03c264c345373f43a6ae3faff6ee5418))
* **client:** resolve TypeScript strict null errors in LiveRoomDetail ([4ae3dbf](https://github.com/dkirby-ms/ellmud/commit/4ae3dbfeffc89b24d38c33995ccb0855db3a66dc))
* **client:** scrollable narrative pane with auto-snap to bottom ([#196](https://github.com/dkirby-ms/ellmud/issues/196)) ([#204](https://github.com/dkirby-ms/ellmud/issues/204)) ([fb6ce15](https://github.com/dkirby-ms/ellmud/commit/fb6ce15526bdb93f919c3f9bac8d6df16af873af))
* **client:** skip dev auto-login when VITE_ALLOW_LOCAL_AUTH=false ([e3b4e6d](https://github.com/dkirby-ms/ellmud/commit/e3b4e6d3b9226923a78f938ad283b7949469fca6))
* **client:** switch Tailwind from Vite plugin to PostCSS plugin ([03aa5dd](https://github.com/dkirby-ms/ellmud/commit/03aa5ddc6ec47cf42738b388c190c1a125fda547))
* combat bugs, zone transitions, layout algorithm, peaceful mode ([807e36a](https://github.com/dkirby-ms/ellmud/commit/807e36a3088242f0e17ef1d58ecf6b275c3aa2d1))
* **combat:** apply shard-sickness debuff on PvP death and emit PvPKillEvent ([72c2b76](https://github.com/dkirby-ms/ellmud/commit/72c2b7631f6afe97ab9fe8522d99b498bda0b8a4))
* **content:** clean up Warrens exit topology ([94a752e](https://github.com/dkirby-ms/ellmud/commit/94a752eb2c5e219fa6a5a4a54fdd03e7057e3e7e))
* copy client dist to correct path in Docker image ([3520177](https://github.com/dkirby-ms/ellmud/commit/3520177f0ded08e17231d5d196f344072fe793c5))
* copy SQL migrations into Docker image, add REDIS_CONNECTIONSTRING env var support ([6e28391](https://github.com/dkirby-ms/ellmud/commit/6e28391d235aa78a385bf27c9a92783a72081025))
* correct verb conjugation in posture self-messages ([bc97893](https://github.com/dkirby-ms/ellmud/commit/bc978938e38a03ad8e93bc5a7fd098fa4475a4ab))
* correct Vitest toBeGreaterThan message arg syntax ([b24de5f](https://github.com/dkirby-ms/ellmud/commit/b24de5ff864c788446f42d98db671a20ea51d68a))
* correct zone→generator import paths in CorpseSystem after merge ([24d82f2](https://github.com/dkirby-ms/ellmud/commit/24d82f2c0160cea1bf1b8dc4c370196463f5edde))
* creature visibility in room descriptions + arrival/departure narrations ([d3bff01](https://github.com/dkirby-ms/ellmud/commit/d3bff01bc494ac7ebb95ba9fc529f42ac5cf881c))
* de-duplicate trace messages by type+direction ([#381](https://github.com/dkirby-ms/ellmud/issues/381)) ([76d6e61](https://github.com/dkirby-ms/ellmud/commit/76d6e61e3284ae3d3acc2e0d1ea57dac5ad01fe4))
* default null JSONB arrays when creating zone rooms ([6f61799](https://github.com/dkirby-ms/ellmud/commit/6f617990b72c610ad684a93562fba1bc34ab5b74))
* delete orphaned exits when deleting a zone room ([65ade39](https://github.com/dkirby-ms/ellmud/commit/65ade395bc3d90dbbd1e4a9ec5cf10eb833f3c27))
* **designer:** capture bounding rect before setTimeout in hover tooltip ([c9073ee](https://github.com/dkirby-ms/ellmud/commit/c9073ee83e7bbe3b3a6acd7504decca2b1437a8a))
* **designer:** fix NPC/loot dropdowns and enrich hover tooltip ([a1af08e](https://github.com/dkirby-ms/ellmud/commit/a1af08ecd958f029c30d1ab504cb58ebb12cf907))
* disable text selection in zone designer panel ([#251](https://github.com/dkirby-ms/ellmud/issues/251)) ([995a484](https://github.com/dkirby-ms/ellmud/commit/995a484bbf4455e49ce4a66597232949babe79df))
* Docker build and ACA deployment issues ([9831972](https://github.com/dkirby-ms/ellmud/commit/9831972409fba7af0756e48f3eee98ceaac177b9))
* **e2e:** fix all 17 E2E tests to pass against running server ([9ee0186](https://github.com/dkirby-ms/ellmud/commit/9ee0186449d6a8a07e0ef95b83168f07729ab96a))
* eliminate last 2 diagonal exits in Siltgate zone ([4a9a857](https://github.com/dkirby-ms/ellmud/commit/4a9a8576ba96c0c2c2c8139e8a56eb887ad770c6))
* enforce auth in local dev — default AUTH_REQUIRED=true, opt-in auto-login ([0d8ea60](https://github.com/dkirby-ms/ellmud/commit/0d8ea603ba1d822286a9462d979a638bcd4e797e))
* enforce strict direction constraints in zone layout ([c97d72c](https://github.com/dkirby-ms/ellmud/commit/c97d72c785bcc35df88fb52d518bdd7640abb26d))
* Entra External ID OAuth — 5 bugs fixed ([e59ca32](https://github.com/dkirby-ms/ellmud/commit/e59ca3202c9bcda1fcb60c05e7950817a42a955f))
* Entra OIDC issuer URL uses tenant GUID subdomain, not custom name ([f8982c7](https://github.com/dkirby-ms/ellmud/commit/f8982c7520ded44af32d9fa7f5b03a509bf4abb6))
* equipped items drop into corpse on death, 12h corpse TTL ([#409](https://github.com/dkirby-ms/ellmud/issues/409)) ([38f3693](https://github.com/dkirby-ms/ellmud/commit/38f369369f8b0218a3d53fafa7e900ae5431ad13))
* expand direction aliases in client sendRawCommand ([c48c5d6](https://github.com/dkirby-ms/ellmud/commit/c48c5d62c5c04d4430a346e1f940533e513566f7))
* **follow:** leader sees follower arrival after room description ([#403](https://github.com/dkirby-ms/ellmud/issues/403)) ([8471a90](https://github.com/dkirby-ms/ellmud/commit/8471a9028c59a82072451717db055ee5baa54baf))
* handle missing topSkills on newly created characters ([6a94373](https://github.com/dkirby-ms/ellmud/commit/6a9437335c66c55aa19129c8ea993e396343428e))
* Handle player death in ShardRoom combat loop ([#109](https://github.com/dkirby-ms/ellmud/issues/109)) ([7c5124b](https://github.com/dkirby-ms/ellmud/commit/7c5124b02ab665107cf9eb1d549848b2d1470cd9))
* hide local login by default, show only with VITE_ALLOW_LOCAL_AUTH=true ([14bb753](https://github.com/dkirby-ms/ellmud/commit/14bb753e157e3838aec167052d8e17a4df96af6c))
* include Redis password in connection URL for ACA add-on auth ([7b53930](https://github.com/dkirby-ms/ellmud/commit/7b53930638a98d4abf3a90eef0e7508651d67f16))
* include roomGraphRooms in zone detail so creatures always render ([e3d506b](https://github.com/dkirby-ms/ellmud/commit/e3d506b6b08f793b2b56fe5fff34590613516344))
* **infra:** align Bicep env vars with server config.ts ([04a74c5](https://github.com/dkirby-ms/ellmud/commit/04a74c594dec035e9060b1139e950c422654cdd2))
* **infra:** Refine Bicep IaC templates — fix compilation, ports, environments ([#18](https://github.com/dkirby-ms/ellmud/issues/18)) ([#76](https://github.com/dkirby-ms/ellmud/issues/76)) ([6d280f5](https://github.com/dkirby-ms/ellmud/commit/6d280f5153f55b013e170081b9c3878d81f9f17d)), closes [#1](https://github.com/dkirby-ms/ellmud/issues/1)
* **infra:** remove invalid identity property from custom scale rule ([8b082e4](https://github.com/dkirby-ms/ellmud/commit/8b082e4b785a2d0baabad842c18558083e128dab))
* **infra:** remove sticky sessions incompatible with single-revision mode ([3030295](https://github.com/dkirby-ms/ellmud/commit/303029551fe21f97449eeb320e34605071c9569d))
* **layout:** direction-biased spiral prevents diagonal room displacement ([ceae937](https://github.com/dkirby-ms/ellmud/commit/ceae937e7fa7a674072d3ce85dd893db54803952))
* **layout:** eliminate diagonal exits in zone layout algorithm ([a2d531f](https://github.com/dkirby-ms/ellmud/commit/a2d531f234f32633f50b28921ba9d3c1bbd11bde))
* **layout:** force-directed relaxation replaces diagonal/occlusion patches ([73c2bf8](https://github.com/dkirby-ms/ellmud/commit/73c2bf8af4ef7d67abc06c3b4e0c27e650df2d7d)), closes [line-throu#room](https://github.com/line-throu/issues/room)
* **layout:** general cardinal alignment without zone-specific logic ([7350db9](https://github.com/dkirby-ms/ellmud/commit/7350db919c2bf68e021f8cbdfadf133dc6c2e503))
* **layout:** grid-aware BFS prevents room displacement in rectangular zones ([af3173c](https://github.com/dkirby-ms/ellmud/commit/af3173c1b5a7e04344f7748ad030eb4158708c51))
* **layout:** independent z-level layout prevents sewer diagonal lines ([4c7bf81](https://github.com/dkirby-ms/ellmud/commit/4c7bf8142597a4796c5d6033f7b676862d5b6550))
* **layout:** post-BFS diagonal optimization pass ([fa35d31](https://github.com/dkirby-ms/ellmud/commit/fa35d31c0f29f64a86433f5c4c3b1ee79e3c36b7))
* **layout:** preserve axis alignment in Midgaard zone layout ([f71adc2](https://github.com/dkirby-ms/ellmud/commit/f71adc2db5acb36a6407d09ae05a64ce095302af))
* **layout:** reduce crossings via row/column exchange in Phase 5e/9 ([fc8164a](https://github.com/dkirby-ms/ellmud/commit/fc8164a662e3276f501f5439ae2ff7710c599510))
* **layout:** reduce room-over-exit-line occlusions in Zone Designer ([bc303cd](https://github.com/dkirby-ms/ellmud/commit/bc303cd3fa61344a8a7d4286dd80518e740f5de9))
* list other visible players by name in room descriptions ([#370](https://github.com/dkirby-ms/ellmud/issues/370)) ([dafd514](https://github.com/dkirby-ms/ellmud/commit/dafd514245db1a1890a7a17f6ac6de06f9a297bb))
* make city wildlife (pigeons, dogs) non-aggressive ([a7c794f](https://github.com/dkirby-ms/ellmud/commit/a7c794fbe372b67ef1e93fc93d35ed6218e3229a))
* make migration 006 idempotent to prevent duplicate key on fresh DB ([17b0274](https://github.com/dkirby-ms/ellmud/commit/17b027411f2d2a6b25e1b628bbf9f8f2ad0bd8a5))
* make migrations 012-016 idempotent (IF NOT EXISTS) ([df34fa9](https://github.com/dkirby-ms/ellmud/commit/df34fa9c7d5f135341aa39191d6cea4647f2ff28))
* make refuge tests resilient to concurrent ambient narration ([6bba873](https://github.com/dkirby-ms/ellmud/commit/6bba8730a014f22a6f328ced985449e7890d13fd))
* make shardboard test resilient to concurrent narration events ([18b573e](https://github.com/dkirby-ms/ellmud/commit/18b573e702e9fc288cbb0e97eae738a1e5a97078))
* make startup errors visible in ACA logs and add SSL for Azure PG ([fb0a181](https://github.com/dkirby-ms/ellmud/commit/fb0a18173993e7533202c39de73ae7db47ff51cb))
* **map:** resolve occlusions via grid expansion instead of rigid guards ([ba65341](https://github.com/dkirby-ms/ellmud/commit/ba65341c9adfa6ec3fef176c9c428b5f03722eda))
* **migration:** blanket-delete Warrens exits before re-insert ([f5a54d9](https://github.com/dkirby-ms/ellmud/commit/f5a54d96039414e2a6eebe766ca184326abb7a27))
* mount PostgreSQL volume at /var/lib/postgresql for PG 18 compatibility ([6c95494](https://github.com/dkirby-ms/ellmud/commit/6c9549438e9ce1dff158a9f8bf3148496e3ce3cd))
* move hooks above early return in Login.tsx to fix React hooks violation ([237736f](https://github.com/dkirby-ms/ellmud/commit/237736f5a1855a7e46beb87160a65de5c03469ea))
* move Reliquary armoury south of stash instead of north ([84ea929](https://github.com/dkirby-ms/ellmud/commit/84ea929674003582f3cffdc16080762766acc18f))
* move Reliquary filtration-annex off inn onto training ([b1594b7](https://github.com/dkirby-ms/ellmud/commit/b1594b75e6d322cb595fcc851b91fe1bb3b79c6d))
* move starter kit items from stash to player inventory ([34e104c](https://github.com/dkirby-ms/ellmud/commit/34e104c4ec106c724c1e55761a5415e2d36ed63d))
* move useDevAutoLogin inside AppContext.Provider ([6ff4083](https://github.com/dkirby-ms/ellmud/commit/6ff4083effe2c39f27af6822f14b209b80453e72))
* OAuth callback redirect — correct CLIENT_URL default and Vite proxy ([50c55fc](https://github.com/dkirby-ms/ellmud/commit/50c55fc9e644ded192c4476d0ea96746dcf41f87))
* Phase 2 bugs — combat movement lock, dodge chance, auth rate limiting, lint cleanup ([cf014bc](https://github.com/dkirby-ms/ellmud/commit/cf014bc41b83f1cd66a6e68362982e2a43b51330)), closes [#1](https://github.com/dkirby-ms/ellmud/issues/1) [#2](https://github.com/dkirby-ms/ellmud/issues/2)
* point static file serving at client/dist instead of nonexistent src/public ([c0989a9](https://github.com/dkirby-ms/ellmud/commit/c0989a98b4adf6917b533fb47c73b6775a941565))
* pre-validate Redis connectivity to prevent ETIMEDOUT crash ([3a649e9](https://github.com/dkirby-ms/ellmud/commit/3a649e96476176ec7e55d0a9145b95ddbd4bc78a))
* preserve player room position on reconnect ([#355](https://github.com/dkirby-ms/ellmud/issues/355)) ([d7eb29f](https://github.com/dkirby-ms/ellmud/commit/d7eb29f98d7f0b52d4f8c9d3707792a441b6e88b))
* prevent cardinal alignment cascade from breaking existing alignments ([b82ce8e](https://github.com/dkirby-ms/ellmud/commit/b82ce8efcb1ed7a4d5502258a53576e1f087de86)), closes [#26](https://github.com/dkirby-ms/ellmud/issues/26)
* prevent direction reversals in zone map layout ([72e9783](https://github.com/dkirby-ms/ellmud/commit/72e97832282a11282a9be4a49b7024c091edf185))
* prevent double-join when entering shard (presence flickers bug) ([a96fcff](https://github.com/dkirby-ms/ellmud/commit/a96fcff4e5f471b624c35f002fb5fa757b9d2845))
* rebuild login screen to match Figma design spec ([bad772a](https://github.com/dkirby-ms/ellmud/commit/bad772a833657def996bb99a89fd4d863ae01a78))
* **refuge:** merge dev, fix WeatherSystem type errors and test types ([f8b501e](https://github.com/dkirby-ms/ellmud/commit/f8b501e058d6bf4872c4c312b6a975e8d71bfc95)), closes [#124](https://github.com/dkirby-ms/ellmud/issues/124)
* **refuge:** remove stale DowningSystem/ShardSickness exports from systems index ([aa51aea](https://github.com/dkirby-ms/ellmud/commit/aa51aea0731face55c72f2a94dd5a3910c03dc44)), closes [#27](https://github.com/dkirby-ms/ellmud/issues/27)
* register Colyseus matchmaking routes via Server.listen() ([e2ebe58](https://github.com/dkirby-ms/ellmud/commit/e2ebe58de9378adcd3b42e27e6135e733b6cbbf5))
* remove /admin redirect loop — Express non-strict routing matches /admin/ too ([9757754](https://github.com/dkirby-ms/ellmud/commit/9757754c17598cf12f9d2ca281e412e8b2e2d28a))
* remove DATABASE_URL from CI/CD set-env-vars ([21f399b](https://github.com/dkirby-ms/ellmud/commit/21f399bd7624aff7ba68ac9a3c48fa9f6d730c9e))
* remove duplicate admin-api exports and fix BiomesList import path ([28955f8](https://github.com/dkirby-ms/ellmud/commit/28955f86559d9df7cb65ab0006581d2909700096)), closes [#149](https://github.com/dkirby-ms/ellmud/issues/149)
* remove legacy .ts template files — creatures are DB-driven ([e086f16](https://github.com/dkirby-ms/ellmud/commit/e086f16c34d7bc8c2e8c76163f474e72bc5e7e00))
* remove misleading exits from Refuge room header ([ec90e06](https://github.com/dkirby-ms/ellmud/commit/ec90e063392af605923fcae6bf84b4f90b6b1706)), closes [#64](https://github.com/dkirby-ms/ellmud/issues/64)
* remove pgcrypto extension (gen_random_uuid built-in since PG 13) ([37c6579](https://github.com/dkirby-ms/ellmud/commit/37c657966fc8909b871b4b919546ae12e1b456a5))
* remove premature anticipatory tests and fix lint errors on dev ([4c50679](https://github.com/dkirby-ms/ellmud/commit/4c50679ed7fad3e44ea198457bb4b03f9e05593d))
* remove REDIS_CONNECTION_STRING from CI/CD env vars ([f6629c0](https://github.com/dkirby-ms/ellmud/commit/f6629c05496d67d2a9f428ec4892b0b3b0493091))
* remove redundant individual migrations already consolidated in 001-003 ([0006429](https://github.com/dkirby-ms/ellmud/commit/00064297d65d9851503496448888975512d60345))
* remove redundant individual migrations already consolidated in 001-003 ([#210](https://github.com/dkirby-ms/ellmud/issues/210)) ([16a4719](https://github.com/dkirby-ms/ellmud/commit/16a47194b336897b3098e23460020b363c8be89f))
* remove unused CONTENT_ENTITY_TYPES import ([362fbc3](https://github.com/dkirby-ms/ellmud/commit/362fbc377483419df83d1b24d57e9fa37a4e7411))
* remove unused getContentRegistry import ([3b7df1c](https://github.com/dkirby-ms/ellmud/commit/3b7df1c73c3d9f78c294986a4ee609ac32fd4505))
* remove unused handleTake/handleDrop imports in item-interaction tests ([ddca780](https://github.com/dkirby-ms/ellmud/commit/ddca780f4b15aefb2214bb02a9624375973c8816))
* remove unused import in container-commands test ([0bf63b1](https://github.com/dkirby-ms/ellmud/commit/0bf63b15f813781ccba3915996bfd03f30de82ca))
* remove unused lastDeployTime variable in deploy-routes ([c02d0ed](https://github.com/dkirby-ms/ellmud/commit/c02d0edece8a5257f5078da4bd5730af106aa0c3))
* remove unused POSTURE_ROOM_DESCRIPTIONS imports ([e8dea52](https://github.com/dkirby-ms/ellmud/commit/e8dea523e431b9e23accd99ab935823aaa444d8c))
* render ambient/awareness narrations and add player movement broadcasts ([5940e7c](https://github.com/dkirby-ms/ellmud/commit/5940e7c3b7196aacb04aa0497b7ae87adfb76a41))
* renumber migration 013_gdd_alignment_renames to 014 after merge ([a703a9e](https://github.com/dkirby-ms/ellmud/commit/a703a9e6a7bfabd1c9c0659817059ba033406433))
* renumber migrations sequentially and remove duplicate definitions ([12b33f9](https://github.com/dkirby-ms/ellmud/commit/12b33f935ebb03fd81d0e988766d5e4506f53ca7))
* replace browser confirm with styled modal for delete room ([#316](https://github.com/dkirby-ms/ellmud/issues/316)) ([62bb849](https://github.com/dkirby-ms/ellmud/commit/62bb849832dffd6dec659e6f053f124e27ac6f0a))
* replace custom hover tooltip with Radix tooltip in zone designer ([#308](https://github.com/dkirby-ms/ellmud/issues/308)) ([e84d97d](https://github.com/dkirby-ms/ellmud/commit/e84d97d9449566238b8240435bfda2e4e222d757))
* resolve 15 TypeScript build errors in server package ([0c7a983](https://github.com/dkirby-ms/ellmud/commit/0c7a9835af39ff30cdb2674512316b41e6e6ee30))
* resolve 27 lint errors for uat CI ([#156](https://github.com/dkirby-ms/ellmud/issues/156)) ([c2e69b9](https://github.com/dkirby-ms/ellmud/commit/c2e69b9d0e940ae1607555a314e16d71cf48c100))
* resolve 3 eslint errors (unused variables) ([f50419f](https://github.com/dkirby-ms/ellmud/commit/f50419ff37ff6318891bf601924961e41012a116))
* resolve 6 TypeScript errors in admin detail pages ([0051256](https://github.com/dkirby-ms/ellmud/commit/005125631a8e9591f6cfd33a8906bc0477f89d1d))
* resolve 60 lint errors across server/client/shared ([b60f77b](https://github.com/dkirby-ms/ellmud/commit/b60f77b5fd8491222c307349c15bd9a70c450a08))
* resolve admin spawn-creature crash from flat-to-nested template mismatch ([5f3eb60](https://github.com/dkirby-ms/ellmud/commit/5f3eb60cb23f76912571b3710409bb86c70d6b15))
* resolve all 19 eslint errors across 6 files ([c875995](https://github.com/dkirby-ms/ellmud/commit/c87599570f2e89d1ab31213aa0d0350ee01d1d66))
* resolve all eslint errors (unused vars) ([a26b294](https://github.com/dkirby-ms/ellmud/commit/a26b294df0ddeb568801044957aed8b1c4a5df3f))
* resolve all lint errors in test files and shared package ([d508e39](https://github.com/dkirby-ms/ellmud/commit/d508e39bf1572d0cb5b4929a80e1df46d495f542))
* resolve eslint errors — unused vars, prefer-const ([fd982db](https://github.com/dkirby-ms/ellmud/commit/fd982db0dd9db972bfb64f6801917e288049ff23))
* resolve eslint no-unused-vars errors blocking CI ([7efbaa3](https://github.com/dkirby-ms/ellmud/commit/7efbaa309fd81f5713246b7e620fa80ac7305953))
* resolve lint errors in server source + install eslint ([8474416](https://github.com/dkirby-ms/ellmud/commit/8474416d35f2efe15da4792bc1ddfe490773fb28))
* resolve merge conflict artifacts and lint errors ([95ef897](https://github.com/dkirby-ms/ellmud/commit/95ef8975445b51bcf8de7d59647a84d9dc4be892))
* resolve merge conflicts with posture sync ([#406](https://github.com/dkirby-ms/ellmud/issues/406)) ([9717aa1](https://github.com/dkirby-ms/ellmud/commit/9717aa1af33a05eeccbc503ff08ae91485b620d4)), closes [#405](https://github.com/dkirby-ms/ellmud/issues/405)
* resolve player UUID showing in combat narration instead of character name ([243fe5e](https://github.com/dkirby-ms/ellmud/commit/243fe5e47bc27f8d2160df3012dd740f10255e2d))
* resolve three medium-severity workflow audit issues ([3da6815](https://github.com/dkirby-ms/ellmud/commit/3da68152f390738b9c3fbf0212eb5da94e91fd27))
* resolve TypeScript build errors from merge conflict artifacts ([5177339](https://github.com/dkirby-ms/ellmud/commit/5177339177811fb55d3b9f7af1ec07cafe623a57))
* resolve TypeScript build errors from merge conflict artifacts ([#96](https://github.com/dkirby-ms/ellmud/issues/96)) ([5a880fb](https://github.com/dkirby-ms/ellmud/commit/5a880fbe50a2ac53ec104ce3f8c7bfb7684b4842))
* respawn at last rented inn room on death (closes [#322](https://github.com/dkirby-ms/ellmud/issues/322)) ([fa71721](https://github.com/dkirby-ms/ellmud/commit/fa7172147e9a019add91d3686fc754d59da47299))
* rewrite useAutoScroll — sentinel pattern with sticky tracking ([61066c7](https://github.com/dkirby-ms/ellmud/commit/61066c7e5c721fb6de7601cb42e16e355f988624))
* room name display — remove duplicate and fix ordering ([6fc12f8](https://github.com/dkirby-ms/ellmud/commit/6fc12f806d145058441270857685ec7a460240e1))
* **sandbox:** resolve 9 no-non-null-assertion lint warnings ([de1d596](https://github.com/dkirby-ms/ellmud/commit/de1d5960daac38f5d561ae2657aa58d5ba455810))
* **security:** address CodeQL alerts — sanitization, ReDoS, rate limiting ([#419](https://github.com/dkirby-ms/ellmud/issues/419)) ([8f9a4fe](https://github.com/dkirby-ms/ellmud/commit/8f9a4fe9ffb30c484745de71c6605c16146acdc7))
* send loadout and stash to client on zone join ([#377](https://github.com/dkirby-ms/ellmud/issues/377)) ([30038ec](https://github.com/dkirby-ms/ellmud/commit/30038ec5d00eca3531e32cb6cefc0594f8bc5b26))
* serve React client from Express in production ([3a45dd0](https://github.com/dkirby-ms/ellmud/commit/3a45dd08af5b035c17dac3873d4e0fbd77fbc33e))
* **server:** add game_metrics to COMPOSITE_PK_TABLES exemption list ([a0548e9](https://github.com/dkirby-ms/ellmud/commit/a0548e94285528317e3a3238b1c98d619d3c84ad))
* **server:** add missing agility property to CombatStats objects ([7b05367](https://github.com/dkirby-ms/ellmud/commit/7b05367d939fcc2b80b07688947f6d8c59d7d302))
* **server:** lazy-init DB pool to fix ESM dotenv race condition ([104b6f4](https://github.com/dkirby-ms/ellmud/commit/104b6f4da78223708231f61c8e4abcd59f04a934))
* **server:** make migrations idempotent to prevent re-run failures ([#367](https://github.com/dkirby-ms/ellmud/issues/367)) ([e29d23e](https://github.com/dkirby-ms/ellmud/commit/e29d23e6e51c846b90819337ebf5c23c6621e3ed))
* **server:** read playerId from client.auth in ShardRoom/RefugeRoom onJoin ([#203](https://github.com/dkirby-ms/ellmud/issues/203)) ([23911e5](https://github.com/dkirby-ms/ellmud/commit/23911e5dda2c88bac06480348e3ba3abe433657a))
* **server:** remove unused imports in test files ([9efa780](https://github.com/dkirby-ms/ellmud/commit/9efa7805153a9df490fe12508405af662cab34e2))
* **server:** replace explicit any with proper types in admin-live-rooms tests ([7ef309e](https://github.com/dkirby-ms/ellmud/commit/7ef309e64cf5981fb39241e92d7d2a3c72c68257))
* **server:** resolve nullable access errors in admin-live-rooms tests ([e26ffeb](https://github.com/dkirby-ms/ellmud/commit/e26ffebd12f6fc0fc46a580bd4c22bb2ac490e9a))
* **server:** resolve TypeScript errors in admin-live-rooms tests ([d014125](https://github.com/dkirby-ms/ellmud/commit/d014125e3c06f5f54b15738935166eed22465c9f))
* ShardRoom uses playerId instead of sessionId — stash items no longer orphaned on reconnect ([#200](https://github.com/dkirby-ms/ellmud/issues/200)) ([b252790](https://github.com/dkirby-ms/ellmud/commit/b252790ad1075c7f18bb1a68fb393fde7695afe6))
* **shared:** update MessageTypes count for TOGGLE_FLAG and GET_FLAGS ([75b6956](https://github.com/dkirby-ms/ellmud/commit/75b6956002d76212e9d89802da8eb91926394cf7))
* show character name instead of GUID in teleport player dropdown ([#356](https://github.com/dkirby-ms/ellmud/issues/356)) ([f67e79a](https://github.com/dkirby-ms/ellmud/commit/f67e79a5927afed25135d3b9ff31e0f70870c360))
* show room slug in narrative header text when devmode is on ([359b4f2](https://github.com/dkirby-ms/ellmud/commit/359b4f2372ce312dbd7bf1ab23bac46fce8e82c2))
* single direction letters no longer trigger speedwalk message ([#380](https://github.com/dkirby-ms/ellmud/issues/380)) ([e101f02](https://github.com/dkirby-ms/ellmud/commit/e101f02c79753b51041cc0e538e11a4a9f2f0ce9))
* spawn-zone faction lookup and starter-kit column mismatch ([0f149b8](https://github.com/dkirby-ms/ellmud/commit/0f149b818bcf010c41d09b4d1b6cfb82e3cc0cae))
* spawned creatures not appearing in admin room list ([a82cf3d](https://github.com/dkirby-ms/ellmud/commit/a82cf3d89123b59b0f0dc2a744aae8a39556166f))
* spawned creatures now appear in admin room list for static zones ([b0b44c1](https://github.com/dkirby-ms/ellmud/commit/b0b44c1373d5d5f7742a4b5fb7b7112ca0d2e9ab))
* stash overflow retains items instead of silent loss ([#183](https://github.com/dkirby-ms/ellmud/issues/183)) ([d4b3ebd](https://github.com/dkirby-ms/ellmud/commit/d4b3ebd26c949b3352772f062e30e3ab3c237fe9))
* suppress dodge narration during post-combat cooldown ([d45a533](https://github.com/dkirby-ms/ellmud/commit/d45a5338c278b4710723f850e66705d95673d973))
* sync .env.example with codebase, add missing docker-compose env var ([bf4c992](https://github.com/dkirby-ms/ellmud/commit/bf4c99238fdeb5d2dda5a0e40b3f661ac7d70a72))
* **test:** handle IF NOT EXISTS in CREATE TABLE regex extraction ([4dd00b2](https://github.com/dkirby-ms/ellmud/commit/4dd00b2f817b5c63f27cef70624b4e460d0df5d3))
* **tests:** resolve 5 lint errors in test files ([19cada3](https://github.com/dkirby-ms/ellmud/commit/19cada352dd5083019547025af748c262aa3d290))
* **test:** update routing tests for Entra-default login UI ([8479a4b](https://github.com/dkirby-ms/ellmud/commit/8479a4befc1ac6ae346e801226af663102876fb3))
* trigger CI/CD after promotion pushes ([b310fe3](https://github.com/dkirby-ms/ellmud/commit/b310fe3c489138b342b15cc8c0dc7d42a5c9fffa))
* try login before register to avoid 409 console noise ([2de4cb0](https://github.com/dkirby-ms/ellmud/commit/2de4cb0c2f69bcc238cfc6e0f1a4c091dd139cb4))
* unwrap character API response objects (shape mismatch) ([ea62e86](https://github.com/dkirby-ms/ellmud/commit/ea62e860bc22d19dc1beeccadd389c40c1f7af7e))
* update creature definitions store tests for new behavior/aggressive columns ([fc380fe](https://github.com/dkirby-ms/ellmud/commit/fc380fe798426f1a410d98f99e9cb6184e4e3440))
* update MessageTypes count to 26 in shared types test ([3d56bc0](https://github.com/dkirby-ms/ellmud/commit/3d56bc017c47007e9e136afe48e29b86a8fb414a))
* update schema validation tests for consolidated column names ([bb602b4](https://github.com/dkirby-ms/ellmud/commit/bb602b4c8c13861fe6fd47ebc45304a4f7d5269d))
* update shard terminology to zone in UI and seed data ([#242](https://github.com/dkirby-ms/ellmud/issues/242)) ([5b2f9e3](https://github.com/dkirby-ms/ellmud/commit/5b2f9e34304e681269233201bf714d11797e12c4))
* upgrade client SDK from colyseus.js 0.16 to @colyseus/sdk 0.17 ([581d0c5](https://github.com/dkirby-ms/ellmud/commit/581d0c5dc7ea60bebfcf28f2ef7f5cda6fc81841))
* use 'biome' column in seed migrations (renamed to 'theme' in 011) ([8b891c6](https://github.com/dkirby-ms/ellmud/commit/8b891c6b4321b33a91add2f68cb6de176678f93c))
* use account UUID for death penalty DB operations ([030a8f2](https://github.com/dkirby-ms/ellmud/commit/030a8f240b5242648accc9d2de068e7c27a314f6))
* use concurrently for dev script to prevent stale processes ([b045167](https://github.com/dkirby-ms/ellmud/commit/b045167749109136591ff23b6d9e65a94a9f6461))
* use explicit CMD instead of empty string to clear bootstrap command ([057e75d](https://github.com/dkirby-ms/ellmud/commit/057e75dedf6d7f6e0e4a7f928e87af00363549ef))
* use playerId instead of sessionId for equipment handler player lookup ([1b99b2f](https://github.com/dkirby-ms/ellmud/commit/1b99b2f913920952c3c4ff8cb44f708089f51a7b))
* use players-table UUID for DB persistence, not characterId ([b9cb922](https://github.com/dkirby-ms/ellmud/commit/b9cb922dbc41d0b2d6a7c82234f8b502d5491120))
* use pre-wrap for system messages to preserve who list alignment ([0efc49b](https://github.com/dkirby-ms/ellmud/commit/0efc49b01b99957fac33b734d0a0a4b75568eebe))
* use real creature stats in combat and show target name in HP display ([0fdfb72](https://github.com/dkirby-ms/ellmud/commit/0fdfb72caf6a84ef77dbf3a6acc5085075b1b8ff))
* use unique host port 5434 for PostgreSQL to avoid Playgrid conflicts ([9bc7c4e](https://github.com/dkirby-ms/ellmud/commit/9bc7c4ec037b272e05a9690e00c7590f075bde5f))
* validate zone existence in goto before issuing zone transfer ([#342](https://github.com/dkirby-ms/ellmud/issues/342)) ([0a9c21f](https://github.com/dkirby-ms/ellmud/commit/0a9c21f4d4c94d0d54648b2650fd3f769a280aa6))
* **warrens:** correct sewer exit directions for grid-compatible layout ([3d64fea](https://github.com/dkirby-ms/ellmud/commit/3d64fea0678b114b109a92ac231e2884dc8ae0a6)), closes [line-throu#room](https://github.com/line-throu/issues/room)
* wire TOGGLE_FLAG handler in ZoneRoom and fix who list alignment ([0f1737c](https://github.com/dkirby-ms/ellmud/commit/0f1737c7ed2920db7899d1c00d6241e2eca5756f))
* wire up useDevAutoLogin hook in Login page ([da93ab7](https://github.com/dkirby-ms/ellmud/commit/da93ab76c11ef405339c3243328784b936a9c0ae))
* wrap text in zone designer room nodes instead of truncating ([d85b159](https://github.com/dkirby-ms/ellmud/commit/d85b1598fd4b389709e1f2da18154698bb6d9294))
* zone designer edges and room positions ([bf5ec0a](https://github.com/dkirby-ms/ellmud/commit/bf5ec0a07caecfe03ca4586d29ecf33a7de854a4))
* zone designer right pane scroll overflow (closes [#327](https://github.com/dkirby-ms/ellmud/issues/327)) ([#329](https://github.com/dkirby-ms/ellmud/issues/329)) ([8cb2d83](https://github.com/dkirby-ms/ellmud/commit/8cb2d83d639d1d43b59d01fbb78be74290ae0e62))
* zone entry respects targetRoomSlug from cross-zone exits ([8b79d8b](https://github.com/dkirby-ms/ellmud/commit/8b79d8bc529089c098c62ddb07043a15928baed0))
* zone players always spawn at designated entry room (hearth for refuge) ([8d1878d](https://github.com/dkirby-ms/ellmud/commit/8d1878dc552429f9382754682dd293215eb6388b))
* zone transfer joins correct zone room instead of generic 'zone' ([a215e59](https://github.com/dkirby-ms/ellmud/commit/a215e59a41b530c49e9e57a16ffa69fbe74ceb2f))
* **zone-designer:** disable minimap component ([b6a0750](https://github.com/dkirby-ms/ellmud/commit/b6a0750b9324f2281383887a6dea3e5c686dfc08))
* **zone-designer:** dismiss context menu on click outside ([43aa248](https://github.com/dkirby-ms/ellmud/commit/43aa2482a721adc55e03f7ac97756b3afcc533ab))
* **zone-designer:** fix tooltip positioning and brighten minimap colors ([d81af53](https://github.com/dkirby-ms/ellmud/commit/d81af53a2ce40dd825634782612d0b30b800d7d4)), closes [#4ADE80](https://github.com/dkirby-ms/ellmud/issues/4ADE80) [#EF4444](https://github.com/dkirby-ms/ellmud/issues/EF4444) [#A78BFA](https://github.com/dkirby-ms/ellmud/issues/A78BFA) [#5EEAD4](https://github.com/dkirby-ms/ellmud/issues/5EEAD4)
* **zone-designer:** improve ELK layout with port constraints and deduplication ([810d6b8](https://github.com/dkirby-ms/ellmud/commit/810d6b8ebe261c137145e26b10a70a65a51a713e))
* **zone-designer:** remove grid background lines ([5f89689](https://github.com/dkirby-ms/ellmud/commit/5f89689ddb134e45be133f11e6788911c3767a67))
* **zone-designer:** remove unnecessary export to fix Vite Fast Refresh ([59a0393](https://github.com/dkirby-ms/ellmud/commit/59a0393a9b0066e0776ccb37b080b6c24f3ea12b))
* **zone-designer:** replace curved edges with orthogonal connectors ([9b0daaf](https://github.com/dkirby-ms/ellmud/commit/9b0daaf11f355b214d60d832cc789f19ab1ae06e))
* **zone-designer:** restore hover tooltips for rooms ([4eefbf2](https://github.com/dkirby-ms/ellmud/commit/4eefbf23d471333544205b9e1acf94e2188b8033))
* **zone-designer:** seed ELK with BFS compass positions via INTERACTIVE mode ([7b5a759](https://github.com/dkirby-ms/ellmud/commit/7b5a75908d3544f7b34d8525ddffbac39ed1d7d4))
* **zone-designer:** show room name in context menu header ([4592675](https://github.com/dkirby-ms/ellmud/commit/4592675455dd91dabb6ff748fa9e395dead28c4b))
* **zone-designer:** single-click selects vertical exit, double-click navigates z-level ([3d2b341](https://github.com/dkirby-ms/ellmud/commit/3d2b341917dc37230ab25abdace0f835e3a33cff))
* **zone-designer:** stabilize tooltip with ref-based timers and leave debounce ([ca1d81e](https://github.com/dkirby-ms/ellmud/commit/ca1d81e0733067971ef9b678d6b63297493259b6))
* **zone-designer:** use ELK fixed algorithm to preserve BFS positions ([82cbfb4](https://github.com/dkirby-ms/ellmud/commit/82cbfb42100db6ac4d73d1828930c2abed4889d2))
* **zone-designer:** use native wheel listener to avoid passive event error ([5261161](https://github.com/dkirby-ms/ellmud/commit/5261161f0ee99a8d039045744e4037052c562d3b))


### Features

* add 'Connect to Zone...' to zone designer context menu ([#317](https://github.com/dkirby-ms/ellmud/issues/317)) ([30ba579](https://github.com/dkirby-ms/ellmud/commit/30ba5795c14f06bc9661e87e09f5e5f5d2c338f2))
* add /peaceful dev mode — per-player creature aggro bypass ([7647aaf](https://github.com/dkirby-ms/ellmud/commit/7647aaf11a64e055e06bbea05cc4b6bfabb90672))
* add 3-second delay before inn rent disconnect ([55987c2](https://github.com/dkirby-ms/ellmud/commit/55987c27fed39cf0335b3acd7bfe962c613efa08))
* add ADMIN_TOKEN and DEV_MODE_ENABLED to CI/CD deploy ([6afe897](https://github.com/dkirby-ms/ellmud/commit/6afe897e70d1469a46ae85222b3ff6b05b7dd7b8))
* add ANSI color preview and tag editor to zone designer ([#332](https://github.com/dkirby-ms/ellmud/issues/332)) ([c0057ae](https://github.com/dkirby-ms/ellmud/commit/c0057ae9198d4c1cec8ca24cfdd86e08398bc1f8))
* add ANSI colored text system (closes [#318](https://github.com/dkirby-ms/ellmud/issues/318)) ([cb64353](https://github.com/dkirby-ms/ellmud/commit/cb643536d47f43ee1ef60bc6a76d9aba387d35e3))
* Add complete bestiary creature definitions ([ec58482](https://github.com/dkirby-ms/ellmud/commit/ec58482961daeef0a3420c48b0b369b93583ab6e)), closes [#391](https://github.com/dkirby-ms/ellmud/issues/391)
* add dedicated stores for skills and loot-tables (migrations 026-027) ([245edd4](https://github.com/dkirby-ms/ellmud/commit/245edd47c62cd7e63baf49ba9123c2614f5e9ede))
* add ENABLE_LLM_NARRATION env toggle ([#295](https://github.com/dkirby-ms/ellmud/issues/295)) ([9d17da2](https://github.com/dkirby-ms/ellmud/commit/9d17da2e08602f0c0f13f708db686c1cd1f452df))
* add feature room type helpers and 39 tests (Zone Unification Phase 1) ([743a449](https://github.com/dkirby-ms/ellmud/commit/743a4490fdb6deeba10a6067e4d17cfbae6859b4))
* add OpenAI-compatible LLM transport for non-Azure endpoints ([#310](https://github.com/dkirby-ms/ellmud/issues/310)) ([4ef53f3](https://github.com/dkirby-ms/ellmud/commit/4ef53f31961b923bccf17281322a8c020074fe76))
* add room features system (Phase 1) — examine/look support ([#345](https://github.com/dkirby-ms/ellmud/issues/345)) ([#354](https://github.com/dkirby-ms/ellmud/issues/354)) ([1dd91ef](https://github.com/dkirby-ms/ellmud/commit/1dd91ef54cf7ace1d7580911d2f830c19e6da1b2))
* add rooms store, drop content_definitions table (migrations 028-029) ([c53f2ee](https://github.com/dkirby-ms/ellmud/commit/c53f2ee68bd9149430a6f47dc94467186b5b7b04))
* add unified dev script to root package.json ([3b1f5fc](https://github.com/dkirby-ms/ellmud/commit/3b1f5fcf75d418c26caa988fe5adf6c3fcab2d8d))
* Admin Dashboard Scaffold — Schema Sync Consumer, Live State Inspection ([#14](https://github.com/dkirby-ms/ellmud/issues/14)) ([#55](https://github.com/dkirby-ms/ellmud/issues/55)) ([23e917d](https://github.com/dkirby-ms/ellmud/commit/23e917dce512faa95db4597570aef08ebcaa0510))
* admin item spawn in Live Rooms ([#389](https://github.com/dkirby-ms/ellmud/issues/389)) ([48e16ce](https://github.com/dkirby-ms/ellmud/commit/48e16ce430bace2dd4a476eecd70c7013ba1c639))
* **admin:** add live rooms API endpoints ([#344](https://github.com/dkirby-ms/ellmud/issues/344)) ([#353](https://github.com/dkirby-ms/ellmud/issues/353)) ([a22d3b7](https://github.com/dkirby-ms/ellmud/commit/a22d3b78071c4fb163774d56ca0f00db10655613))
* **admin:** add occupancy filters and context menu to live rooms graph ([70f6746](https://github.com/dkirby-ms/ellmud/commit/70f6746d24b56c8f6816c81d3a0b3bb39f26681b)), closes [#384](https://github.com/dkirby-ms/ellmud/issues/384) [#385](https://github.com/dkirby-ms/ellmud/issues/385) [#384](https://github.com/dkirby-ms/ellmud/issues/384) [#385](https://github.com/dkirby-ms/ellmud/issues/385)
* **admin:** default to Designer tab on zone detail page ([ce60625](https://github.com/dkirby-ms/ellmud/commit/ce60625541ced3abc16b82b6d2252d8c3d4ea933))
* **admin:** expose creature state in admin dashboard and API ([#7](https://github.com/dkirby-ms/ellmud/issues/7)) ([#82](https://github.com/dkirby-ms/ellmud/issues/82)) ([f8b5b1a](https://github.com/dkirby-ms/ellmud/commit/f8b5b1a8b6c3da0c9ec1b09a725a72d2d492586d))
* **admin:** Live zone room management in LiveRoomDetail ([#344](https://github.com/dkirby-ms/ellmud/issues/344)) ([#352](https://github.com/dkirby-ms/ellmud/issues/352)) ([e05c584](https://github.com/dkirby-ms/ellmud/commit/e05c5841858dc7e38b3a09c3ed008d3315772656))
* adopt semantic-release for automated versioning ([dcd3bbe](https://github.com/dkirby-ms/ellmud/commit/dcd3bbe1ed9b4233c06fbb135d28d914774c7535))
* **auth:** add GET /auth/me endpoint for token validation ([583ed80](https://github.com/dkirby-ms/ellmud/commit/583ed805d3cd2812880353621491b1f7b536fb15))
* **auth:** Entra External ID OAuth for player authentication ([#153](https://github.com/dkirby-ms/ellmud/issues/153)) ([ab5d275](https://github.com/dkirby-ms/ellmud/commit/ab5d2756e960257ba5915eb74b9487da9d97ba17)), closes [#140](https://github.com/dkirby-ms/ellmud/issues/140)
* automated version bumping on promote ([8863bf2](https://github.com/dkirby-ms/ellmud/commit/8863bf2e2a190f247cb14e903a490f7694828e0e))
* bare direction words (north/south/etc) now move the player ([5a0db79](https://github.com/dkirby-ms/ellmud/commit/5a0db79ab7b081b821563ea282a795ce315b2070))
* Basic Item System — Gear Stats, Durability, Rarity Tiers ([#16](https://github.com/dkirby-ms/ellmud/issues/16)) ([#52](https://github.com/dkirby-ms/ellmud/issues/52)) ([9735ee8](https://github.com/dkirby-ms/ellmud/commit/9735ee86db9a0ef68bbc7bdc7883fd88ed0ff1b0)), closes [#4](https://github.com/dkirby-ms/ellmud/issues/4) [#4](https://github.com/dkirby-ms/ellmud/issues/4) [#3](https://github.com/dkirby-ms/ellmud/issues/3) [#19](https://github.com/dkirby-ms/ellmud/issues/19) [#3](https://github.com/dkirby-ms/ellmud/issues/3) [#19](https://github.com/dkirby-ms/ellmud/issues/19) [#8](https://github.com/dkirby-ms/ellmud/issues/8) [#5](https://github.com/dkirby-ms/ellmud/issues/5) [#8](https://github.com/dkirby-ms/ellmud/issues/8) [#5](https://github.com/dkirby-ms/ellmud/issues/5) [#6](https://github.com/dkirby-ms/ellmud/issues/6) [#9](https://github.com/dkirby-ms/ellmud/issues/9) [#12](https://github.com/dkirby-ms/ellmud/issues/12) [#12](https://github.com/dkirby-ms/ellmud/issues/12) [#6](https://github.com/dkirby-ms/ellmud/issues/6) [#9](https://github.com/dkirby-ms/ellmud/issues/9) [#7](https://github.com/dkirby-ms/ellmud/issues/7) [#13](https://github.com/dkirby-ms/ellmud/issues/13) [#10](https://github.com/dkirby-ms/ellmud/issues/10)
* bypass login screen in dev mode ([fe43ec5](https://github.com/dkirby-ms/ellmud/commit/fe43ec56a74542d367d8055ae2025bff6024357d))
* character posture system ([#371](https://github.com/dkirby-ms/ellmud/issues/371)) ([#376](https://github.com/dkirby-ms/ellmud/issues/376)) ([4cf60d3](https://github.com/dkirby-ms/ellmud/commit/4cf60d3a358153dbf3b5aa062b105bb3dc3754fd)), closes [#373](https://github.com/dkirby-ms/ellmud/issues/373) [#375](https://github.com/dkirby-ms/ellmud/issues/375) [#375](https://github.com/dkirby-ms/ellmud/issues/375) [#373](https://github.com/dkirby-ms/ellmud/issues/373)
* character system — server foundation ([7c2995c](https://github.com/dkirby-ms/ellmud/commit/7c2995ca1d3adae04fbafb85acc414e0695ff29d))
* CI/CD pipeline — build, test, deploy to Container Apps ([#17](https://github.com/dkirby-ms/ellmud/issues/17)) ([#56](https://github.com/dkirby-ms/ellmud/issues/56)) ([fc4894a](https://github.com/dkirby-ms/ellmud/commit/fc4894adb6031c00954f2319127b1ff585293f23))
* clean up procedural generator module ([#241](https://github.com/dkirby-ms/ellmud/issues/241)) ([56627a9](https://github.com/dkirby-ms/ellmud/commit/56627a96d25f793981fcf5e49d01d3e53a954258))
* **client:** add ANSI tag rendering for items and creatures ([#418](https://github.com/dkirby-ms/ellmud/issues/418)) ([313c923](https://github.com/dkirby-ms/ellmud/commit/313c92354d19a261f112f740a24b6352b0b792de))
* **client:** add flag toggles to settings UI ([#365](https://github.com/dkirby-ms/ellmud/issues/365)) ([fd845a3](https://github.com/dkirby-ms/ellmud/commit/fd845a3b60db1c7e090179950ef96a1548d0c879))
* **client:** add issue report link and brighten version number ([ab02115](https://github.com/dkirby-ms/ellmud/commit/ab02115af4ab569f625b0d5ee9533e5a32527ea2))
* **client:** add MUD-style prompt/status line to narrative scroll ([c879250](https://github.com/dkirby-ms/ellmud/commit/c879250e45838a3a0667bec963fe55bd45fbee8c))
* **client:** add who list modal and online players button ([#366](https://github.com/dkirby-ms/ellmud/issues/366)) ([bd4c202](https://github.com/dkirby-ms/ellmud/commit/bd4c2020f07fa0b35ebc3c82d056c571f2db99e5))
* **client:** Button design system ([#74](https://github.com/dkirby-ms/ellmud/issues/74)) ([#84](https://github.com/dkirby-ms/ellmud/issues/84)) ([03a2044](https://github.com/dkirby-ms/ellmud/commit/03a2044155a3a5255df8938b33b5918a2eae308d)), closes [#10](https://github.com/dkirby-ms/ellmud/issues/10) [#7](https://github.com/dkirby-ms/ellmud/issues/7) [#2](https://github.com/dkirby-ms/ellmud/issues/2) [#3](https://github.com/dkirby-ms/ellmud/issues/3) [#5](https://github.com/dkirby-ms/ellmud/issues/5) [#7](https://github.com/dkirby-ms/ellmud/issues/7) [#9](https://github.com/dkirby-ms/ellmud/issues/9) [#10](https://github.com/dkirby-ms/ellmud/issues/10) [#11](https://github.com/dkirby-ms/ellmud/issues/11) [#18](https://github.com/dkirby-ms/ellmud/issues/18)
* **client:** Chat & social panel — proximity chat ([#73](https://github.com/dkirby-ms/ellmud/issues/73)) ([cfc2e16](https://github.com/dkirby-ms/ellmud/commit/cfc2e16f4344a6f631debc59f6dbb8238ad21eb0))
* **client:** Clickable exits in narrative panel ([#67](https://github.com/dkirby-ms/ellmud/issues/67)) ([#86](https://github.com/dkirby-ms/ellmud/issues/86)) ([cabea74](https://github.com/dkirby-ms/ellmud/commit/cabea741f08407c90734e49f4710737893cbc3ae)), closes [#10](https://github.com/dkirby-ms/ellmud/issues/10) [#7](https://github.com/dkirby-ms/ellmud/issues/7) [#2](https://github.com/dkirby-ms/ellmud/issues/2) [#3](https://github.com/dkirby-ms/ellmud/issues/3) [#5](https://github.com/dkirby-ms/ellmud/issues/5) [#7](https://github.com/dkirby-ms/ellmud/issues/7) [#9](https://github.com/dkirby-ms/ellmud/issues/9) [#10](https://github.com/dkirby-ms/ellmud/issues/10) [#11](https://github.com/dkirby-ms/ellmud/issues/11) [#18](https://github.com/dkirby-ms/ellmud/issues/18) [#3A7D7B](https://github.com/dkirby-ms/ellmud/issues/3A7D7B) [#C9A84C](https://github.com/dkirby-ms/ellmud/issues/C9A84C)
* **client:** combat/sidebar polish — 10 UX gaps (Batch 2) ([#104](https://github.com/dkirby-ms/ellmud/issues/104)) ([afaa80b](https://github.com/dkirby-ms/ellmud/commit/afaa80b808f8672b0d7e7cd8679a7ef1510b4ae3)), closes [#103](https://github.com/dkirby-ms/ellmud/issues/103) [#10-21](https://github.com/dkirby-ms/ellmud/issues/10-21)
* **client:** direction shortcuts + speedwalk parser ([#357](https://github.com/dkirby-ms/ellmud/issues/357)) ([2085460](https://github.com/dkirby-ms/ellmud/commit/20854608cfde669e6b3dde8403f2fe361380ef7d))
* **client:** extract StatusPanel with 3-tab layout ([#404](https://github.com/dkirby-ms/ellmud/issues/404)) ([a434ae1](https://github.com/dkirby-ms/ellmud/commit/a434ae16d4528cbe4516ebf49c808e29a636ed21))
* **client:** Extraction screen — loot summary & victory state ([#72](https://github.com/dkirby-ms/ellmud/issues/72)) ([391ae51](https://github.com/dkirby-ms/ellmud/commit/391ae51dbfa221e637c6b7ce4e384e3e2c88976c))
* **client:** in-game settings modal to prevent zone disconnect ([4ced657](https://github.com/dkirby-ms/ellmud/commit/4ced65701be7f9145e03ff0e9986c64c6c86c112))
* **client:** inline MUD prompt with click-to-focus and focus glow ([#358](https://github.com/dkirby-ms/ellmud/issues/358)) ([08b24c0](https://github.com/dkirby-ms/ellmud/commit/08b24c068d0d8716e4520ac9e697d5f5042c3b68))
* **client:** loading & transition states ([#71](https://github.com/dkirby-ms/ellmud/issues/71)) ([5fa856a](https://github.com/dkirby-ms/ellmud/commit/5fa856a4170c8082942fbe23f5a01c9638044b00))
* **client:** loading & transition states ([#71](https://github.com/dkirby-ms/ellmud/issues/71)) ([d14f419](https://github.com/dkirby-ms/ellmud/commit/d14f4196b670c2dbe77bacf23cc35229d98b7b1b))
* **client:** persistent compass navigation control ([#205](https://github.com/dkirby-ms/ellmud/issues/205)) ([bbcb7ed](https://github.com/dkirby-ms/ellmud/commit/bbcb7ede93ef1d283c17d79e805ec2c608f1b478)), closes [#195](https://github.com/dkirby-ms/ellmud/issues/195) [#195](https://github.com/dkirby-ms/ellmud/issues/195) [#195](https://github.com/dkirby-ms/ellmud/issues/195)
* **client:** reconnection overlay with auto-retry ([#70](https://github.com/dkirby-ms/ellmud/issues/70)) ([e6c6953](https://github.com/dkirby-ms/ellmud/commit/e6c695353a647bd647b88e9e720609ff4e9c7c5f)), closes [#2D6B4F](https://github.com/dkirby-ms/ellmud/issues/2D6B4F)
* **client:** reconnection overlay with auto-retry ([#70](https://github.com/dkirby-ms/ellmud/issues/70)) ([c791ff6](https://github.com/dkirby-ms/ellmud/commit/c791ff6e9a26fe2ce9cf20f067fca20ddb81d6c6)), closes [#2D6B4F](https://github.com/dkirby-ms/ellmud/issues/2D6B4F)
* **client:** Refuge Hub tabbed navigation & context panels ([#68](https://github.com/dkirby-ms/ellmud/issues/68)) ([f27bf90](https://github.com/dkirby-ms/ellmud/commit/f27bf90471ddd353d97a8a1bf1eee28a85d8860e))
* **client:** rename Shardwalker → Character in player-facing UI ([7c3bb00](https://github.com/dkirby-ms/ellmud/commit/7c3bb00cdd4406892185183bf38e040c281f1549)), closes [#230](https://github.com/dkirby-ms/ellmud/issues/230)
* **client:** replace /refuge route with /zone, add spawn-zone API ([#309](https://github.com/dkirby-ms/ellmud/issues/309)) ([3dff994](https://github.com/dkirby-ms/ellmud/commit/3dff994f48bee14090af04297869e927caec7ae5))
* **client:** settings sync via API — useSettings hook + Settings.tsx refactor ([#359](https://github.com/dkirby-ms/ellmud/issues/359)) ([f4ab813](https://github.com/dkirby-ms/ellmud/commit/f4ab813f90778dd1e4f6d0e4486ff9ce5a31a983))
* **client:** Shard exploration sidebar & combat overlay ([#66](https://github.com/dkirby-ms/ellmud/issues/66)) ([494fa8f](https://github.com/dkirby-ms/ellmud/commit/494fa8fd5c660d83fb0d45a1f29d079eea115646))
* **client:** Shardboard shard selection cards ([#69](https://github.com/dkirby-ms/ellmud/issues/69)) ([7e3b39f](https://github.com/dkirby-ms/ellmud/commit/7e3b39f2bbd2dc1f4563693b73311d63c4e4863b))
* **client:** Shardboard shard selection cards ([#69](https://github.com/dkirby-ms/ellmud/issues/69)) ([0df0bb1](https://github.com/dkirby-ms/ellmud/commit/0df0bb1e25dde2fe0f3cd1b08cbdbee299ec7246))
* **client:** Toast notification system — 4 types, queue, auto-dismiss ([#75](https://github.com/dkirby-ms/ellmud/issues/75)) ([76d251f](https://github.com/dkirby-ms/ellmud/commit/76d251f4a63aea9637d06f7ce2fb63fa49f79592))
* **client:** UX overhaul — Figma SPA conversion with Colyseus wiring ([#100](https://github.com/dkirby-ms/ellmud/issues/100)) ([cedb59f](https://github.com/dkirby-ms/ellmud/commit/cedb59f4ffae73160d695c6ff63ee6a74d13a826))
* **client:** zone UI indicators, transfer handler, and zone listings in Shardboard ([7602825](https://github.com/dkirby-ms/ellmud/commit/760282563a4e557aad7f6576ba5a1a9a92dab668))
* close all PG persistence gaps — profile, tokens, shard-sickness ([d359246](https://github.com/dkirby-ms/ellmud/commit/d35924677582d6d46f34e4e6189dcc5a749837f6))
* color combat messages by event type ([#110](https://github.com/dkirby-ms/ellmud/issues/110)) ([0f761af](https://github.com/dkirby-ms/ellmud/commit/0f761af30c8019cabeb65b7f927f20d7df466b18))
* Combat Sandbox Phase 1 — rooms, commands, selective ticking ([f8d8489](https://github.com/dkirby-ms/ellmud/commit/f8d848973d0c9f38ce676d4672f7dedcdd197f85))
* **combat:** expose DamageBreakdown on tick results for sandbox observability ([d8e83cb](https://github.com/dkirby-ms/ellmud/commit/d8e83cb76ff8f34cf9a9f8d92b9695192bd78182))
* **combat:** implement dodge chance calculation (GDD §6.4) ([#162](https://github.com/dkirby-ms/ellmud/issues/162)) ([#194](https://github.com/dkirby-ms/ellmud/issues/194)) ([1d28ee8](https://github.com/dkirby-ms/ellmud/commit/1d28ee8008737a74692833d87c593a96ada742fc))
* **combat:** PvP combat with friendly fire, death drops, no XP farming (closes [#24](https://github.com/dkirby-ms/ellmud/issues/24)) ([e81d0c0](https://github.com/dkirby-ms/ellmud/commit/e81d0c0e79b004e6de08c9be5e2da46df8392686))
* **commands:** add open, put, take-from container commands ([#409](https://github.com/dkirby-ms/ellmud/issues/409)) ([2a45d7f](https://github.com/dkirby-ms/ellmud/commit/2a45d7f91b4d933033f562fed0b736c360c38bb5))
* **commands:** add toggle command and follow-blocking ([#417](https://github.com/dkirby-ms/ellmud/issues/417)) ([8e0604b](https://github.com/dkirby-ms/ellmud/commit/8e0604b1f589c22465fd606868ec053ea2aa27f4))
* connect faction strongholds to world zones ([c683882](https://github.com/dkirby-ms/ellmud/commit/c683882e1fc93d1cfef9c7dd17ef81841e312b32))
* **content:** expand Warrens zone to 101 rooms with 7x7 slums grid ([84337ce](https://github.com/dkirby-ms/ellmud/commit/84337ce29f6b02d7f330e4af6eed740e1e85766c))
* **creatures:** wire creature spawning, AI tick, and loot into ShardRoom ([#7](https://github.com/dkirby-ms/ellmud/issues/7)) ([223e8fa](https://github.com/dkirby-ms/ellmud/commit/223e8faa0f34c8eee0df60b69ff907e4d7329a90))
* DB schema cleanup — GDD terminology alignment ([#240](https://github.com/dkirby-ms/ellmud/issues/240)) ([a12484e](https://github.com/dkirby-ms/ellmud/commit/a12484ea0aa028223cfa2993b14141bf07a5a913))
* DB-driven content definitions (creatures + items) ([6fb6841](https://github.com/dkirby-ms/ellmud/commit/6fb68413718fb79eaf3fa2a756cbd2401d6de60d))
* **db:** PostgreSQL repository implementations and migration wiring ([#3](https://github.com/dkirby-ms/ellmud/issues/3)) ([#77](https://github.com/dkirby-ms/ellmud/issues/77)) ([47de4db](https://github.com/dkirby-ms/ellmud/commit/47de4db850cad7e57b57dc3136b61bc40aea9c94))
* Death & Downing — Bleed-Out Timer, Stabilization, Shard-Sickness (closes [#27](https://github.com/dkirby-ms/ellmud/issues/27)) ([#125](https://github.com/dkirby-ms/ellmud/issues/125)) ([aea4f27](https://github.com/dkirby-ms/ellmud/commit/aea4f2765405ab6adfc19038200e89fe1ba3060c)), closes [#119](https://github.com/dkirby-ms/ellmud/issues/119) [#120](https://github.com/dkirby-ms/ellmud/issues/120) [#119](https://github.com/dkirby-ms/ellmud/issues/119) [#31](https://github.com/dkirby-ms/ellmud/issues/31) [#119](https://github.com/dkirby-ms/ellmud/issues/119)
* dedicated biome and modifier definition stores ([a938d5a](https://github.com/dkirby-ms/ellmud/commit/a938d5a7dc6050bf3dd8441ad7dc31a090cef8ce))
* dedicated narrative and creature definition stores ([10fde32](https://github.com/dkirby-ms/ellmud/commit/10fde32686d38400a61034e5950473167c1093f1))
* delete extraction system (dead code) ([#228](https://github.com/dkirby-ms/ellmud/issues/228)) ([a77f676](https://github.com/dkirby-ms/ellmud/commit/a77f676fe574826ace91d8e7bb4d069a276c1a70))
* **designer:** halve room node size (100×100 → 50×50) ([254ac12](https://github.com/dkirby-ms/ellmud/commit/254ac12d2b65d0ae7338d9ea286afdc20c041400))
* **designer:** hide inter-floor exit lines and ghost rooms ([60bec41](https://github.com/dkirby-ms/ellmud/commit/60bec41bc45657752cc548a42be22f079fb92866))
* **designer:** NPC/item placement UI + resizable room details pane ([bbf5ee0](https://github.com/dkirby-ms/ellmud/commit/bbf5ee0a20acc3e3102a84458b6c9d17b0c99e49))
* **designer:** remove direction labels from exit edges ([28724c4](https://github.com/dkirby-ms/ellmud/commit/28724c489c552df4c291cb29856084efe8287484))
* **designer:** square rooms, wider panel, hover tooltips with toggle ([0a899fd](https://github.com/dkirby-ms/ellmud/commit/0a899fd86896a5d40eba4fbfc2a28b29feb5ee98))
* dev-only GOTO <room-slug> command (closes [#328](https://github.com/dkirby-ms/ellmud/issues/328)) ([#330](https://github.com/dkirby-ms/ellmud/issues/330)) ([7733e53](https://github.com/dkirby-ms/ellmud/commit/7733e537ff7595db98cf583f81db8feac870c776))
* dev-only teleport <player> <room> command (closes [#333](https://github.com/dkirby-ms/ellmud/issues/333)) ([#335](https://github.com/dkirby-ms/ellmud/issues/335)) ([1fecfe2](https://github.com/dkirby-ms/ellmud/commit/1fecfe2eafe4de2b93849bcf51c31cd2f39e063f))
* **e2e:** add follow & consent E2E tests ([#416](https://github.com/dkirby-ms/ellmud/issues/416)) ([7f8493d](https://github.com/dkirby-ms/ellmud/commit/7f8493d6144abb133266db3b292db64bfcae002e))
* **e2e:** add group feature E2E tests ([#416](https://github.com/dkirby-ms/ellmud/issues/416)) ([aca6dc6](https://github.com/dkirby-ms/ellmud/commit/aca6dc6b4c672d3dcf6e6ce7ec06d6959c6316a9))
* **e2e:** add multiplayer connection & movement E2E tests ([#416](https://github.com/dkirby-ms/ellmud/issues/416)) ([5d9ab29](https://github.com/dkirby-ms/ellmud/commit/5d9ab2987cf7e73854d087c8246c8419f9687e2d))
* **e2e:** add Playwright E2E testing infrastructure ([#416](https://github.com/dkirby-ms/ellmud/issues/416)) ([7913ac2](https://github.com/dkirby-ms/ellmud/commit/7913ac22c5f765e1d5d8396104267e1cc50fe94e))
* extend zone designer zoom range (0.1x–8x) ([391a131](https://github.com/dkirby-ms/ellmud/commit/391a131cb61bfd9aa6a104e0e971ceb95a2e545c))
* extraction stash transfer on successful extraction ([#10](https://github.com/dkirby-ms/ellmud/issues/10)) ([e6d93f1](https://github.com/dkirby-ms/ellmud/commit/e6d93f14561ca376f855cd04c44f975e937079bd))
* **factions:** resolve dual-table conflict with dedicated PgFactionDefinitionsStore ([87a51e9](https://github.com/dkirby-ms/ellmud/commit/87a51e9750d9e1ca9e2a1c2791380a22608d7237))
* fix death and spawn routing to faction strongholds ([#238](https://github.com/dkirby-ms/ellmud/issues/238)) ([e3c1d21](https://github.com/dkirby-ms/ellmud/commit/e3c1d2134401ee22808e8407dcb3f7c9960d7520)), closes [#236](https://github.com/dkirby-ms/ellmud/issues/236) [#237](https://github.com/dkirby-ms/ellmud/issues/237) [#258](https://github.com/dkirby-ms/ellmud/issues/258) [#259](https://github.com/dkirby-ms/ellmud/issues/259)
* fix Siltgate zone topology + add zone validator ([5075d20](https://github.com/dkirby-ms/ellmud/commit/5075d209dc84a10b9940cd0c53b9866a6a2484c6))
* fix Warrens zone topology + add layout tests ([6d3f36b](https://github.com/dkirby-ms/ellmud/commit/6d3f36b9365728bc6100b382630a4baa246da710))
* follow + consent system ([#403](https://github.com/dkirby-ms/ellmud/issues/403) Phase 1+2) ([e4d40e4](https://github.com/dkirby-ms/ellmud/commit/e4d40e425904a3a14712b92a2dc6b67aa39c1565))
* full 16-color ANSI palette + undo-friendly tag insertion ([#334](https://github.com/dkirby-ms/ellmud/issues/334)) ([295fc05](https://github.com/dkirby-ms/ellmud/commit/295fc05016266cd326e878bba651d51ffd3f9463))
* gameplay metrics system — server-side event collection ([#360](https://github.com/dkirby-ms/ellmud/issues/360)) ([fc91d68](https://github.com/dkirby-ms/ellmud/commit/fc91d682d377a4def39b46bc97dfae33ccb98cfb))
* **gameplay:** Extraction mechanic — ritual channel with interruption ([#10](https://github.com/dkirby-ms/ellmud/issues/10)) ([#83](https://github.com/dkirby-ms/ellmud/issues/83)) ([87699c9](https://github.com/dkirby-ms/ellmud/commit/87699c9878d9c27dfd6d58d43b89279e9104b4d3))
* **goto:** support cross-zone teleport via goto zone:room syntax ([c27b345](https://github.com/dkirby-ms/ellmud/commit/c27b345ee8969b2ec4a15962ac02fbe9ae6f973f))
* group combat, room positioning, and build versioning ([22b9d69](https://github.com/dkirby-ms/ellmud/commit/22b9d6992b95e02a9560351bbe81061f14da2296))
* group formation system ([#403](https://github.com/dkirby-ms/ellmud/issues/403) Phase 3) ([63d2cb5](https://github.com/dkirby-ms/ellmud/commit/63d2cb56b4902d31c59b34de85fe05485a617628)), closes [#408](https://github.com/dkirby-ms/ellmud/issues/408)
* **groups:** Phase 6 - Group Loot Sharing ([#403](https://github.com/dkirby-ms/ellmud/issues/403)) ([cd009e1](https://github.com/dkirby-ms/ellmud/commit/cd009e12bf78f1417923d286cbcec79c014aa7c7))
* **help:** context-aware help command with per-command details ([#340](https://github.com/dkirby-ms/ellmud/issues/340)) ([795994e](https://github.com/dkirby-ms/ellmud/commit/795994e8a6dfb9c184199ca40ea3f4cdb8f55685))
* implement 81 creature templates from bestiary design ([fd37a8b](https://github.com/dkirby-ms/ellmud/commit/fd37a8b27dd14ce6d3f99a26aa178535c32bae5c)), closes [#391](https://github.com/dkirby-ms/ellmud/issues/391)
* implement corpse/loot-on-death system ([#237](https://github.com/dkirby-ms/ellmud/issues/237)) ([80fcf84](https://github.com/dkirby-ms/ellmud/commit/80fcf84300d8781a36b0ab210ffebe71ee28e2b2))
* implement faction strongholds ([#236](https://github.com/dkirby-ms/ellmud/issues/236)) ([075905a](https://github.com/dkirby-ms/ellmud/commit/075905a1783c3f441bda4d3221d73266a380d44b))
* implement inn/rent system ([#312](https://github.com/dkirby-ms/ellmud/issues/312)) ([ea3ed62](https://github.com/dkirby-ms/ellmud/commit/ea3ed623449cf2da6490cbc75c30082cb0b7e2d3))
* implement PlayerProfileRepository save/load cycle ([#201](https://github.com/dkirby-ms/ellmud/issues/201)) ([ef59520](https://github.com/dkirby-ms/ellmud/commit/ef59520e3dfb5fb40fd44de378741f59138d9da3))
* implement Refuge ↔ Shard room switching ([#65](https://github.com/dkirby-ms/ellmud/issues/65)) ([a742710](https://github.com/dkirby-ms/ellmud/commit/a742710e65b62085c92b22bde0d3c8d20b3ecfb1))
* implement server-side user flags backend ([#365](https://github.com/dkirby-ms/ellmud/issues/365)) ([5db527f](https://github.com/dkirby-ms/ellmud/commit/5db527f3cb124914e4cc374497d76d82c255771e))
* implement server-side who list ([#366](https://github.com/dkirby-ms/ellmud/issues/366)) ([de35e7c](https://github.com/dkirby-ms/ellmud/commit/de35e7c01a8a57bbb3729b068eec3864089ec91a))
* import Midgaard as playable adventure zone ([#331](https://github.com/dkirby-ms/ellmud/issues/331)) ([0df5d3c](https://github.com/dkirby-ms/ellmud/commit/0df5d3cf63d0ea701c243beb5acaf86660bec493))
* improve in-game UX formatting and display ([2767b94](https://github.com/dkirby-ms/ellmud/commit/2767b943354b53eaf5d82c4b8480ea5c677ce098))
* improve login UX and UI polish ([3e6596e](https://github.com/dkirby-ms/ellmud/commit/3e6596e34f23f14235528e5510425cea97666d8c))
* improve name generator with length variety and 3-syllable procedural names ([5b14e13](https://github.com/dkirby-ms/ellmud/commit/5b14e1384d0b08ac8114323b00d4d3ac1e7ce673))
* increase creature idle tick times by 10x ([688f5f9](https://github.com/dkirby-ms/ellmud/commit/688f5f90a38a4b514003714ac09ee4d90e716031))
* individual creature lines in room descriptions ([#383](https://github.com/dkirby-ms/ellmud/issues/383)) ([126dd5b](https://github.com/dkirby-ms/ellmud/commit/126dd5b408e2dbbe8e87542fed7369376f125240))
* **infra:** Bicep IaC for Azure infrastructure ([#18](https://github.com/dkirby-ms/ellmud/issues/18), [#1](https://github.com/dkirby-ms/ellmud/issues/1)) ([#57](https://github.com/dkirby-ms/ellmud/issues/57)) ([18d23a2](https://github.com/dkirby-ms/ellmud/commit/18d23a237e69d542af4deb33217c04676be748a0))
* **inventory:** persistent inventory storage ([#409](https://github.com/dkirby-ms/ellmud/issues/409)) ([3b0e65a](https://github.com/dkirby-ms/ellmud/commit/3b0e65a78057bff365c5a3c9c286282f004ce269))
* **items:** add container item type with nested storage ([#409](https://github.com/dkirby-ms/ellmud/issues/409)) ([628f49e](https://github.com/dkirby-ms/ellmud/commit/628f49e33aefbce0237d3a2dfabf52956f70f217))
* **layout:** detect and resolve criss-crossing edges ([be9754d](https://github.com/dkirby-ms/ellmud/commit/be9754df783fd304c38223de5bd59ee80654dfb3))
* **layout:** post-BFS cardinal alignment pass ([42bf37b](https://github.com/dkirby-ms/ellmud/commit/42bf37be0148e40b92d71ae6eb2e53a56fe8a775))
* **layout:** visual crossing detection with Phase 10 pipeline ([159b6e1](https://github.com/dkirby-ms/ellmud/commit/159b6e155ec433d3331ca298c76ceee5599e7ac6))
* **map:** add grid spacing to BFS layout engine ([b7a86af](https://github.com/dkirby-ms/ellmud/commit/b7a86afcf4ad3e92b46b88d2f3f2bbfe6ba658b5))
* **map:** add Phase 5e selective row/column insertion for edge crossings ([b424ec9](https://github.com/dkirby-ms/ellmud/commit/b424ec9599f5fd120601b7590140b001002d9132))
* Multi-Player Shards — Redis Presence, KEDA Scaling, Matchmaker (closes [#21](https://github.com/dkirby-ms/ellmud/issues/21)) ([#124](https://github.com/dkirby-ms/ellmud/issues/124)) ([c2c4352](https://github.com/dkirby-ms/ellmud/commit/c2c4352ae87169e643bc6e3f7d792b55c9300d45)), closes [#119](https://github.com/dkirby-ms/ellmud/issues/119) [#120](https://github.com/dkirby-ms/ellmud/issues/120) [#119](https://github.com/dkirby-ms/ellmud/issues/119) [#31](https://github.com/dkirby-ms/ellmud/issues/31) [#119](https://github.com/dkirby-ms/ellmud/issues/119)
* multi-player shards with Redis presence ([#21](https://github.com/dkirby-ms/ellmud/issues/21)) ([#106](https://github.com/dkirby-ms/ellmud/issues/106)) ([12f8850](https://github.com/dkirby-ms/ellmud/commit/12f885093781a9e6329b4bfc5792b1395448583e))
* **narrative:** LLM narration pipeline — timeout budgets, background enrichment, output validation ([#9](https://github.com/dkirby-ms/ellmud/issues/9)) ([#79](https://github.com/dkirby-ms/ellmud/issues/79)) ([5638925](https://github.com/dkirby-ms/ellmud/commit/56389251cbc7655b08ccc391a2d72ac4643ebb75)), closes [#78](https://github.com/dkirby-ms/ellmud/issues/78)
* per-item room descriptions with ANSI tag support ([#386](https://github.com/dkirby-ms/ellmud/issues/386)) ([1bbf209](https://github.com/dkirby-ms/ellmud/commit/1bbf209b8382a673eda1376a8839b573d1eee252))
* PgLoadoutRepository + persistence fixes ([05d9555](https://github.com/dkirby-ms/ellmud/commit/05d9555d9a133d76a7bd73f49f7bc8b0147d80ff))
* Player Awareness & Stealth Detection (GDD §8.1) ([#119](https://github.com/dkirby-ms/ellmud/issues/119)) ([6c91e49](https://github.com/dkirby-ms/ellmud/commit/6c91e49c58808903fe448e96ec603d66c9241d7b)), closes [#117](https://github.com/dkirby-ms/ellmud/issues/117) [#118](https://github.com/dkirby-ms/ellmud/issues/118) [#117](https://github.com/dkirby-ms/ellmud/issues/117) [#118](https://github.com/dkirby-ms/ellmud/issues/118) [#25](https://github.com/dkirby-ms/ellmud/issues/25) [#114](https://github.com/dkirby-ms/ellmud/issues/114) [#25](https://github.com/dkirby-ms/ellmud/issues/25)
* player item interaction - get/drop/equip ([#390](https://github.com/dkirby-ms/ellmud/issues/390)) ([0df83ad](https://github.com/dkirby-ms/ellmud/commit/0df83ad83e1f58a3b4f5fea6d4cc3d0f614ab042)), closes [#371](https://github.com/dkirby-ms/ellmud/issues/371)
* prototype DikuMUD zone importer script ([b677699](https://github.com/dkirby-ms/ellmud/commit/b67769919dca806ed0ff28f253be391a359d788c))
* proximity communication — say, whisper, emote ([#26](https://github.com/dkirby-ms/ellmud/issues/26)) ([#107](https://github.com/dkirby-ms/ellmud/issues/107)) ([e52d909](https://github.com/dkirby-ms/ellmud/commit/e52d9092f4d66876499587f4e64f0ecbe1646796))
* raise zone capacity defaults for shared persistent zones ([4486708](https://github.com/dkirby-ms/ellmud/commit/448670895a8f3e8855b4cc7144edb58b39137ad3))
* random cyber noir character names with regenerate button ([#368](https://github.com/dkirby-ms/ellmud/issues/368)) ([ee3e991](https://github.com/dkirby-ms/ellmud/commit/ee3e9917754969b483feb82ab5414b27038a2e37))
* **redis:** Redis container + Colyseus presence wiring ([#2](https://github.com/dkirby-ms/ellmud/issues/2)) ([#78](https://github.com/dkirby-ms/ellmud/issues/78)) ([0891670](https://github.com/dkirby-ms/ellmud/commit/0891670db3f853cf354096b4a367f87b6f8ce245))
* Refuge ↔ Shard room switching (closes [#65](https://github.com/dkirby-ms/ellmud/issues/65)) ([#105](https://github.com/dkirby-ms/ellmud/issues/105)) ([0a0d902](https://github.com/dkirby-ms/ellmud/commit/0a0d9026af3816d449f3cb0bcc5ad032fbc2bc31)), closes [#104](https://github.com/dkirby-ms/ellmud/issues/104) [#104](https://github.com/dkirby-ms/ellmud/issues/104)
* **refuge:** ambient world with NPCs, weather, faction events, merchants (closes [#29](https://github.com/dkirby-ms/ellmud/issues/29)) ([4b2625b](https://github.com/dkirby-ms/ellmud/commit/4b2625b672d1fa3f91c1f77d9c16e899dc9e2810))
* remove midgaard zone import ([#420](https://github.com/dkirby-ms/ellmud/issues/420)) ([#423](https://github.com/dkirby-ms/ellmud/issues/423)) ([dfe8890](https://github.com/dkirby-ms/ellmud/commit/dfe8890fcd5b3f48a17b2d0d25b6e293e1d39544))
* rename gold→water currency and rewrite 212 room descriptions ([79d0132](https://github.com/dkirby-ms/ellmud/commit/79d0132e582ac9729f7b4d8f5b7aa1e34d040812))
* render portal exits as stub edges on the correct room side ([f51042a](https://github.com/dkirby-ms/ellmud/commit/f51042a797c4f2886c3c7cb767019763f2cacdbd))
* replace faction choice with starting zone selection + reputation system ([2d20fdc](https://github.com/dkirby-ms/ellmud/commit/2d20fdc8f5646fa799ba56374be9ca3648f4f233))
* repurpose Refuge as designer/debug hub ([#239](https://github.com/dkirby-ms/ellmud/issues/239)) ([0bc22d1](https://github.com/dkirby-ms/ellmud/commit/0bc22d1b1b2dc09ac4aa8f58a0a0c6e47178e098)), closes [#259](https://github.com/dkirby-ms/ellmud/issues/259)
* retheme creatures and items for Gulf Coast setting ([f631786](https://github.com/dkirby-ms/ellmud/commit/f631786a079ad578c8d522c8beb8e62358b48cef))
* rich creature room descriptions, admin behavior flags, loot table fix ([688828f](https://github.com/dkirby-ms/ellmud/commit/688828f9180ef373965334449d6d764f37d042fc))
* role-based admin access (player | content-dev | admin) [#373](https://github.com/dkirby-ms/ellmud/issues/373) ([253f185](https://github.com/dkirby-ms/ellmud/commit/253f185a4f69cdb2ded4a45bdb6331ac632de2a8))
* room occupants messaging and status panel component ([1334947](https://github.com/dkirby-ms/ellmud/commit/1334947ca81f0ccbf98197ffb38e2a4b0722be55))
* room-level illumination system (Phase 1) ([#402](https://github.com/dkirby-ms/ellmud/issues/402)) ([a55cc04](https://github.com/dkirby-ms/ellmud/commit/a55cc04d3fcf913080aa744b28e6bd6d1368a342))
* **sandbox:** deterministic PRNG seeding + combat replay (Phase 3) ([a0b4640](https://github.com/dkirby-ms/ellmud/commit/a0b4640ed1bcdd099aaa1fa448d750aa40448a06))
* **sandbox:** Phase 2 tuning tools — set, info, clear, log subcommands ([ef1318e](https://github.com/dkirby-ms/ellmud/commit/ef1318eadf7ede9414ef0a0169b9b818df125dfb))
* **sandbox:** Phase 3 — scenario save/load/list/delete ([a511c4e](https://github.com/dkirby-ms/ellmud/commit/a511c4e9a9b474cf6522caa77dafeedc0008129c))
* sensory narration templates for Wave 2 systems ([#116](https://github.com/dkirby-ms/ellmud/issues/116)) ([d17c0e7](https://github.com/dkirby-ms/ellmud/commit/d17c0e723e78e3f9171c23aaa35a2ba96409f6b0))
* server-authoritative LoadoutService with atomic equip/unequip/swap ([fd144c1](https://github.com/dkirby-ms/ellmud/commit/fd144c14cf4a00f0ac3983ee4dcb98fff298cb0b))
* **server:** add user settings backend — migration, repository, API ([#359](https://github.com/dkirby-ms/ellmud/issues/359)) ([fb130d7](https://github.com/dkirby-ms/ellmud/commit/fb130d7922e23b224e334ad45efa4367856b3fb9))
* **server:** Redis Cache Integration + Docker Compose ([#2](https://github.com/dkirby-ms/ellmud/issues/2)) ([#58](https://github.com/dkirby-ms/ellmud/issues/58)) ([31a34a1](https://github.com/dkirby-ms/ellmud/commit/31a34a10c26efffccceec06e039ef403c6e1f292))
* **server:** Solo play config — enforce 1 player per shard ([#15](https://github.com/dkirby-ms/ellmud/issues/15)) ([#53](https://github.com/dkirby-ms/ellmud/issues/53)) ([117dfe3](https://github.com/dkirby-ms/ellmud/commit/117dfe393288db8eafec138ef564e767ab072577))
* **shard:** Room graph generation — Tier 1 single biome ([#5](https://github.com/dkirby-ms/ellmud/issues/5)) ([#81](https://github.com/dkirby-ms/ellmud/issues/81)) ([39ea858](https://github.com/dkirby-ms/ellmud/commit/39ea8581a2e59a0d4c8b1732027faa44be1b18bb))
* show creatures in room descriptions on their own line ([d7475e1](https://github.com/dkirby-ms/ellmud/commit/d7475e112b64fa57b718d93e7de6b8bcf9be38c2))
* show portal exit direction and target zone in zone designer ([98ea892](https://github.com/dkirby-ms/ellmud/commit/98ea892987bef37d0ad9f57e41dc8558c245d3d8))
* Sound Propagation System (GDD §12) ([#118](https://github.com/dkirby-ms/ellmud/issues/118)) ([1349803](https://github.com/dkirby-ms/ellmud/commit/1349803e01ef5becfe988f12ae3329e7e7b0dd84)), closes [#22](https://github.com/dkirby-ms/ellmud/issues/22) [#23](https://github.com/dkirby-ms/ellmud/issues/23) [#25](https://github.com/dkirby-ms/ellmud/issues/25) [#22](https://github.com/dkirby-ms/ellmud/issues/22)
* Stash Persistence — Save/Load Player Inventory ([#11](https://github.com/dkirby-ms/ellmud/issues/11)) ([#51](https://github.com/dkirby-ms/ellmud/issues/51)) ([61ec8b0](https://github.com/dkirby-ms/ellmud/commit/61ec8b097bf5c6bd31f27a7adb62dd3f0befd421)), closes [#4](https://github.com/dkirby-ms/ellmud/issues/4) [#4](https://github.com/dkirby-ms/ellmud/issues/4) [#3](https://github.com/dkirby-ms/ellmud/issues/3) [#19](https://github.com/dkirby-ms/ellmud/issues/19) [#3](https://github.com/dkirby-ms/ellmud/issues/3) [#19](https://github.com/dkirby-ms/ellmud/issues/19) [#8](https://github.com/dkirby-ms/ellmud/issues/8) [#5](https://github.com/dkirby-ms/ellmud/issues/5) [#8](https://github.com/dkirby-ms/ellmud/issues/8) [#5](https://github.com/dkirby-ms/ellmud/issues/5) [#6](https://github.com/dkirby-ms/ellmud/issues/6) [#9](https://github.com/dkirby-ms/ellmud/issues/9) [#12](https://github.com/dkirby-ms/ellmud/issues/12) [#12](https://github.com/dkirby-ms/ellmud/issues/12) [#6](https://github.com/dkirby-ms/ellmud/issues/6) [#9](https://github.com/dkirby-ms/ellmud/issues/9) [#7](https://github.com/dkirby-ms/ellmud/issues/7) [#13](https://github.com/dkirby-ms/ellmud/issues/13) [#10](https://github.com/dkirby-ms/ellmud/issues/10)
* **stash:** Wire stash persistence into game loop ([#11](https://github.com/dkirby-ms/ellmud/issues/11)) ([#80](https://github.com/dkirby-ms/ellmud/issues/80)) ([cd71e2c](https://github.com/dkirby-ms/ellmud/commit/cd71e2cc317e1420362f4ea7fe76842c8e7ed2cb))
* sync posture to client via PlayerStateMessage ([#404](https://github.com/dkirby-ms/ellmud/issues/404)) ([eb75b89](https://github.com/dkirby-ms/ellmud/commit/eb75b899ef5f09ca86a51c755ea35a8bab6b383e))
* The Warrens zone, PLAYER_STATE pipeline, equipment silhouette, room name fix ([b206861](https://github.com/dkirby-ms/ellmud/commit/b206861eb632aac524325cc84927df3a36f3456f))
* Trace System — ephemeral room traces (footprints, blood, corpses) ([#117](https://github.com/dkirby-ms/ellmud/issues/117)) ([93cddfc](https://github.com/dkirby-ms/ellmud/commit/93cddfce8a374fc97123757c7ac3509a5922ad01)), closes [#23](https://github.com/dkirby-ms/ellmud/issues/23)
* WebSocket reconnection tuning ([#28](https://github.com/dkirby-ms/ellmud/issues/28)) ([#108](https://github.com/dkirby-ms/ellmud/issues/108)) ([d6a2156](https://github.com/dkirby-ms/ellmud/commit/d6a215676e4c29dcee45456ff522b5b78cb54389))
* wire character system — client flow, room integration, characterId passthrough ([430c1ee](https://github.com/dkirby-ms/ellmud/commit/430c1ee0330b47695821b3426e77910666ef0b81))
* wire INVENTORY_UPDATE message for Gear tab inventory pane ([8d934c9](https://github.com/dkirby-ms/ellmud/commit/8d934c945a683ef319016d299f48134580f53eb5))
* wire status panel to PLAYER_STATE data, polish silhouette ([ef440f8](https://github.com/dkirby-ms/ellmud/commit/ef440f8ee8145afbb6023a88e3118ab18beeb31b))
* Wire up missing runtime repositories (skills, factions, run history) [#198](https://github.com/dkirby-ms/ellmud/issues/198) ([#202](https://github.com/dkirby-ms/ellmud/issues/202)) ([9b5f7e6](https://github.com/dkirby-ms/ellmud/commit/9b5f7e6d557ccef220896f2297f215a3473c75fe))
* z-level floor switching for zone designer and in-game map ([71316ab](https://github.com/dkirby-ms/ellmud/commit/71316abc051ce4870106bdc17752cef6bfdea91c))
* zone designer exit improvements — portal styling, orphan UI, edit panel ([2c04e74](https://github.com/dkirby-ms/ellmud/commit/2c04e7475818089e8271b2a0bfb2734760965c76))
* zone spawn routing, exploration map, cascade deletes & player logging ([f836325](https://github.com/dkirby-ms/ellmud/commit/f836325967b8c5a1b583849a6f3e6f0f55f15f36))
* Zone system Phase A — data layer complete ([ec9c28f](https://github.com/dkirby-ms/ellmud/commit/ec9c28f0bd741c51e082d6a075c8d49a05b22374))
* Zone system Phase B — server integration complete ([a970d05](https://github.com/dkirby-ms/ellmud/commit/a970d050cc130a5fed5cea4b07b68593f6e63635))
* Zone system Phase C+D — admin UI + Refuge migration ([8ee3e12](https://github.com/dkirby-ms/ellmud/commit/8ee3e12c70dc22de8add16bec77d103a0126ec5a))
* **zone-designer:** add insert room on exit ([#252](https://github.com/dkirby-ms/ellmud/issues/252)) ([9da1410](https://github.com/dkirby-ms/ellmud/commit/9da1410e731c39dadd9b2b8766066d14c605e1c7))
* **zone-designer:** add pan support, cursor indicators, fix scrollbar overflow ([921ae25](https://github.com/dkirby-ms/ellmud/commit/921ae250aa9c01c07712f5bccc51985e33a6c940))
* **zone-designer:** add right-click context menu on room nodes ([91d2926](https://github.com/dkirby-ms/ellmud/commit/91d2926177a7bc16347bb18f7916fc6985658999))
* **zone-designer:** add vertical exit badges on room nodes ([f598c5c](https://github.com/dkirby-ms/ellmud/commit/f598c5c8bcd01a6ed01d74ec9f0997d1ae553ca8)), closes [#a78bfa](https://github.com/dkirby-ms/ellmud/issues/a78bfa)
* **zone-designer:** add zoom in/out controls ([b7dffb9](https://github.com/dkirby-ms/ellmud/commit/b7dffb99f995b3e7a7c7a10ea8cbb351af1171a5))
* **zone-designer:** exit context menu + styled insert-room confirm ([4083d9d](https://github.com/dkirby-ms/ellmud/commit/4083d9d318dc407d019076659caacc24b38fd3e2))
* **zone-designer:** Phase 4 Visual Enhancements ([#287](https://github.com/dkirby-ms/ellmud/issues/287)) ([25785e8](https://github.com/dkirby-ms/ellmud/commit/25785e8d9c9e3b89c96db83a74d577f143a7dc09))
* **zone-designer:** room edit panel, content badges, z-nav, preview ([f5242b2](https://github.com/dkirby-ms/ellmud/commit/f5242b2df617131e14b876f0ad94cb5fbe38a836))
* **zone-designer:** Search & Filter (Phase 5.2) ([#289](https://github.com/dkirby-ms/ellmud/issues/289)) ([99eac29](https://github.com/dkirby-ms/ellmud/commit/99eac2939f32a69fd9cd8476718759570bbb7af4)), closes [#271](https://github.com/dkirby-ms/ellmud/issues/271) [#287](https://github.com/dkirby-ms/ellmud/issues/287) [#273](https://github.com/dkirby-ms/ellmud/issues/273) [#288](https://github.com/dkirby-ms/ellmud/issues/288) [#286](https://github.com/dkirby-ms/ellmud/issues/286) [#273](https://github.com/dkirby-ms/ellmud/issues/273) [#272](https://github.com/dkirby-ms/ellmud/issues/272)
* **zone-designer:** Undo/Redo for CRUD operations (5.1) ([#290](https://github.com/dkirby-ms/ellmud/issues/290)) ([572f0f4](https://github.com/dkirby-ms/ellmud/commit/572f0f40c8703d8be32e928cc91a06e8fb6a5234))


### Performance Improvements

* **computeLayout:** Phase 2 — fix mutation bug, cache posToRoom, delta scoring ([b51a65e](https://github.com/dkirby-ms/ellmud/commit/b51a65e1e47dc512820b03fe189abb640885de26))
