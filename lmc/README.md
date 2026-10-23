# LMC Lab

Little Man’s Computer is an auxiliary computer-architecture simulator within SciCal600.

Live subdomain: https://lmc.scical600.pages.dev/

Main-site route: https://scical600.pages.dev/lmc/

## Lecture alignment

Based on the supplied **Lec5.1-Case Study-Little Man’s Computer** and **Lec5.2-Case Study-Little Man’s Computer** slides.

- 100 shared instruction/data mailboxes (00–99), unsigned 000–999 words, FIFO input/output.
- LDA, STO (also STA/STORE), ADD, SUB, INP, OUT, HLT/COB, BRA, BRZ, BRP and DAT.
- Assembly labels, explicit addresses, machine code, editable memory, breakpoints, instruction stepping and RTL stepping with PC, ACC, IR, MAR and MDR.
- Examples: echo, addition, larger number, absolute difference, 0–9 loop, conditional (Part 1 p. 35), self-modifying loader (Part 1 p. 40), and RTL exercise (Part 2 pp. 29–32). Repeated-addition multiplication is an extra practice example.
- Performance: adjustable clock rate, cycles, executed instruction mix and memory operations. Part 2 p. 37 timing: LDA/STO/ADD/SUB = 7, INP/OUT = 5, branches = 4, HLT = 3. The p. 39 exercise evaluates to 3045 cycles / 100 MHz = 30.45 microseconds.
- English and Traditional Chinese; switching language preserves execution state.

The slides show a separate decode explanation in the eight-step LDA walkthrough. The simulator combines decode with the IR transfer to follow the seven-cycle timing table. A negative SUB is displayed modulo 1000 with a separate negative flag; this is an explicit simulator convention because the slides do not specify the negative-result encoding. Carry is discarded. HLT does not increment PC; branches update PC in their final cycle, matching the lecture’s BRA register snapshot.

The loader example inputs `901, 902, 000, 42`: the first three values become a program, which echoes 42 and returns to the loader. It then waits for another program, rather than halting.

The page is self-contained in `index.html`. `npm run build` includes it for the main site and the existing Cloudflare branch-alias deployment. `npm test` includes regression checks against the actual page engine and lecture examples.
