'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../lmc/index.html'), 'utf8');
const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({});
vm.runInContext(script.split('// i18n.js')[0] + '\nthis.lab = {assemble, Machine, examples, CYCLES};', context);
const {assemble, Machine, examples, CYCLES} = context.lab;
const plain = value => JSON.parse(JSON.stringify(value));
function run(source, input = [], limit = 2000) {
  const machine = new Machine(assemble(source));
  machine.enqueue(input);
  while (!machine.halted && !machine.error && !machine.waiting && limit-- > 0) machine.step();
  assert.ok(limit > 0, 'Program should halt or wait within the instruction limit');
  assert.equal(machine.error, null);
  return machine;
}

test('lecture examples produce their expected outputs', () => {
  for (const [key, output] of Object.entries({echo:[42],add:[12],max:[9],diff:[5],loop:[0,1,2,3,4,5,6,7,8,9],multiply:[24],conditional:[1],rtl:[12],loader:[42]})) {
    const example = examples[key];
    const machine = run(example.source, example.input);
    assert.deepEqual(plain(machine.output), output, key);
    assert.equal(machine.waiting, ['loader','rtl'].includes(key), key);
  }
  for (const input of [0,4,5,6,999]) {
    assert.deepEqual(plain(run(examples.conditional.source,[input]).output), [input>5?0:1]);
  }
  for (const inputs of [[4,9],[9,4],[5,5]]) {
    assert.deepEqual(plain(run(examples.max.source,inputs).output), [Math.max(...inputs)]);
    assert.deepEqual(plain(run(examples.diff.source,inputs).output), [Math.abs(inputs[0]-inputs[1])]);
  }
});

test('STO preserves ACC, uses seven cycles and follows the lecture RTL transfers', () => {
  const machine = new Machine(assemble(examples.rtl.source));
  machine.enqueue([7,5]);
  machine.step(); machine.step(); machine.step();
  assert.equal(machine.pc,3);
  const before = machine.cycles;
  machine.step();
  assert.equal(machine.cycles-before,7);
  assert.equal(machine.acc,5);
  assert.equal(machine.memory[11],5);
  assert.equal(machine.memoryWrites,2);
  assert.deepEqual(plain(machine.trace.slice(-7).map(row=>row.rtl)).sort(),
    ['PC → MAR','M[MAR] → MDR','MDR → IR','PC + 1 → PC','IR[address] → MAR','ACC → MDR','MDR → M[MAR]'].sort());
});

test('BRA 00 at mailbox 06 matches the four-register lecture snapshot', () => {
  const machine = new Machine(assemble(examples.rtl.source));
  machine.enqueue([7,5]);
  for(let i=0;i<7;i++) machine.step();
  assert.deepEqual([machine.mar,machine.mdr,machine.ir,machine.pc],[6,600,600,0]);
  assert.equal(machine.trace.at(-1).rtl,'IR[address] → PC');
});

test('every instruction has the lecture cycle count and memory-operation count', () => {
  for(const [op, cycles] of Object.entries(CYCLES)) {
    const operand = ['LDA','STO','ADD','SUB','BRA','BRZ','BRP'].includes(op)?' 99':'';
    const machine = new Machine(assemble(`${op}${operand}\n99 DAT 1`));
    machine.enqueue([42]); machine.step();
    assert.equal(machine.cycles,cycles,op);
    assert.equal(machine.instructions,1,op);
    assert.equal(machine.instructionCounts[op],1,op);
    assert.equal(machine.memoryReads + machine.memoryWrites, ['LDA','STO','ADD','SUB'].includes(op)?2:1,op);
  }
  const machine=run(examples.add.source,examples.add.input);
  assert.equal(machine.cycles,32);
  assert.equal(machine.memoryReads,7);
  assert.equal(machine.memoryWrites,1);
  assert.equal(Object.entries(CYCLES).reduce((sum,[op,cycles])=>sum+cycles*machine.instructionCounts[op],0),machine.cycles);
});

test('self-modifying loader can load and execute a second program', () => {
  const machine=run(examples.loader.source,examples.loader.input);
  assert.equal(machine.memory[2],650);
  assert.equal(machine.memory[51],300);
  machine.enqueue([901,902,0,77]);
  let limit=200;
  while(!machine.waiting && !machine.error && limit-->0) machine.step();
  assert.ok(limit>0);
  assert.deepEqual(plain(machine.output),[42,77]);
  assert.equal(machine.error,null);
});

test('input wait does not count stalled cycles and reset clears counters', () => {
  const machine=run('INP\nOUT\nHLT');
  const cycles=machine.cycles;
  machine.step(); machine.step();
  assert.equal(machine.cycles,cycles);
  assert.equal(machine.instructions,0);
  machine.enqueue([12]);
  machine.step();machine.step();machine.step();
  assert.equal(machine.cycles,13);
  assert.deepEqual(plain(machine.output),[12]);
  machine.reset();
  assert.equal(machine.memoryReads+machine.memoryWrites+machine.instructions+machine.cycles,0);
});

test('arithmetic wraps to three digits and negative flag controls BRP', () => {
  assert.equal(run('LDA A\nADD B\nHLT\nA DAT 999\nB DAT 2').acc,1);
  const machine=run('LDA A\nSUB B\nBRP 05\nOUT\nHLT\nHLT\nA DAT 3\nB DAT 5');
  assert.equal(machine.acc,998);
  assert.equal(machine.negative,true);
  assert.deepEqual(plain(machine.output),[998]);
});

test('invalid machine instructions stop and invalid source is rejected', () => {
  const machine=new Machine(assemble('00 903','machine'));
  machine.step(); assert.match(machine.error,/903/);
  for(const source of ['LDA MISSING','00 INP\n00 OUT','BRA 100','DAT 1000']) assert.throws(()=>assemble(source));
});
