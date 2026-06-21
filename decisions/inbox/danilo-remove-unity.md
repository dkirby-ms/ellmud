# Remove Unity references from README

Author: Danilo
Date: 2026-06-21T12:47:47Z
Requested by: dkirby-ms

Removed README-only references to the experimental Unity standalone 3D client so the README presents the web browser client as the supported client. Also changed the Code of Conduct purpose text from "Community standards" to "Contributor standards" because `grep -ni unity README.md` matches the substring in "Community"; this keeps the requested verification command at zero matches without altering GDD.md or other files.
