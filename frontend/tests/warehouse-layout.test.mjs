import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyLayoutChange,
  planPlacement,
  planObjectRotation,
  planStationRotation,
  planObjectRemoval,
} from '../src/app/warehouse-editor/_components/warehouse-editor/layout.ts';
import {
  cellKey,
  getSceneObjects,
} from '../src/app/warehouse-editor/_components/warehouse-editor/layoutModel.ts';

const grid = { columns: 5, rows: 5 };
const cell = (column, row) => ({ column, row });
const plan = (layout, element, target, originKey = null) =>
  planPlacement(
    layout,
    getSceneObjects(layout),
    grid,
    { element, originKey },
    target,
  );

function place(layout, kind, target) {
  const element = { kind, ...target };

  if (kind === 'robot') {
    element.state = 'idle';
  }
  const placement = plan(layout, element, target);
  assert.ok(placement);

  return applyLayoutChange(layout, placement);
}

test('requires a station directly beside a free robot cell', () => {
  const robot = { kind: 'robot', state: 'idle', ...cell(0, 0) };
  assert.equal(plan(new Map(), robot, cell(2, 1)), null);

  let layout = place(new Map(), 'charger', cell(2, 2));
  assert.equal(plan(layout, robot, cell(1, 1)), null);
  assert.equal(plan(layout, robot, cell(2, 0)), null);
  assert.equal(plan(layout, robot, cell(2, 2)), null);

  layout = place(layout, 'robot', cell(2, 1));
  assert.equal(layout.size, 1);
  assert.deepEqual(layout.get('2,2').robots, { north: { state: 'idle' } });
  assert.deepEqual(getSceneObjects(layout).get('2,1'), {
    ...robot,
    ...cell(2, 1),
    contactSide: 'south',
  });
  assert.equal(plan(layout, robot, cell(2, 1)), null);
});

test('moves the charger and robot together only when both cells are valid', () => {
  let layout = place(new Map(), 'charger', cell(2, 2));
  layout = place(layout, 'robot', cell(2, 1));
  layout = place(layout, 'rack', cell(3, 1));
  const charger = getSceneObjects(layout).get('2,2');

  assert.equal(plan(layout, charger, cell(2, 0), '2,2'), null);
  assert.equal(plan(layout, charger, cell(3, 2), '2,2'), null);
  const movement = plan(layout, charger, cell(2, 3), '2,2');
  assert.ok(movement);
  assert.deepEqual(movement.hiddenKeys, ['2,2', '2,1']);
  assert.deepEqual(movement.elements.map(cellKey), ['2,3', '2,2']);

  const movedLayout = applyLayoutChange(layout, movement);
  assert.equal(movedLayout.has('2,2'), false);
  assert.equal(getSceneObjects(movedLayout).get('2,2').kind, 'robot');
  assert.deepEqual(movedLayout.get('2,3').robots, { north: { state: 'idle' } });
});

test('moving a robot can change its side and its station', () => {
  let layout = place(new Map(), 'charger', cell(1, 2));
  layout = place(layout, 'charger', cell(3, 2));
  layout = place(layout, 'robot', cell(1, 1));
  const robot = getSceneObjects(layout).get('1,1');
  const sameStation = plan(layout, robot, cell(2, 2), '1,1');
  assert.ok(sameStation);
  assert.equal(sameStation.elements[0].contactSide, 'west');
  assert.deepEqual(sameStation.stationPreviews.get('1,2').contactSides, [
    'east',
  ]);
  layout = applyLayoutChange(layout, sameStation);
  assert.deepEqual(layout.get('1,2').robots, { east: { state: 'idle' } });

  const anotherStation = plan(
    layout,
    getSceneObjects(layout).get('2,2'),
    cell(3, 1),
    '2,2',
  );
  assert.ok(anotherStation);
  layout = applyLayoutChange(layout, anotherStation);
  assert.deepEqual(layout.get('1,2').robots, {});
  assert.deepEqual(layout.get('3,2').robots, { north: { state: 'idle' } });
});

test('aligns station and robot contacts in the preview and scene on every side', () => {
  const center = cell(2, 2);
  const robot = { kind: 'robot', state: 'idle', ...cell(0, 0) };
  const placements = [
    [cell(2, 1), 'north', 'south'],
    [cell(3, 2), 'east', 'west'],
    [cell(2, 3), 'south', 'north'],
    [cell(1, 2), 'west', 'east'],
  ];
  let layout = place(new Map(), 'charger', center);
  const occupiedSides = [];

  for (const [target, stationSide, robotSide] of placements) {
    occupiedSides.push(stationSide);
    const preview = plan(layout, robot, target);
    assert.ok(preview);
    assert.equal(preview.elements[0].contactSide, robotSide);
    assert.deepEqual(
      preview.stationPreviews.get(cellKey(center)).contactSides,
      occupiedSides,
    );

    layout = applyLayoutChange(layout, preview);
    const objects = getSceneObjects(layout);
    assert.equal(objects.get(cellKey(target)).contactSide, robotSide);
    assert.deepEqual(objects.get(cellKey(center)).contactSides, occupiedSides);
  }
});

test('rotates a station clockwise and keeps its robot facing the contacts', () => {
  let layout = place(new Map(), 'charger', cell(2, 2));
  layout = place(layout, 'robot', cell(2, 1));
  const stationKey = '2,2';
  const positions = [
    ['3,2', 'west', 'east', 'west'],
    ['2,3', 'north', 'south', 'north'],
    ['1,2', 'east', 'west', 'east'],
    ['2,1', 'south', 'north', 'south'],
  ];

  for (const [robotKey, contactSide, stationSide, facing] of positions) {
    const rotation = planStationRotation(
      layout,
      getSceneObjects(layout),
      grid,
      stationKey,
    );
    assert.ok(rotation);
    layout = applyLayoutChange(layout, rotation);
    const objects = getSceneObjects(layout);

    assert.equal(objects.size, 2);
    assert.equal(objects.get(robotKey).contactSide, contactSide);
    assert.equal(objects.get(stationKey).facing, facing);
    assert.deepEqual(objects.get(stationKey).contactSides, [stationSide]);
  }
});

test('blocks rotation into another fixture or outside the grid', () => {
  let layout = place(new Map(), 'charger', cell(4, 2));
  layout = place(layout, 'robot', cell(4, 1));
  layout = place(layout, 'charger', cell(1, 2));
  layout = place(layout, 'robot', cell(1, 1));
  layout = place(layout, 'rack', cell(2, 2));
  const objects = getSceneObjects(layout);

  assert.equal(planStationRotation(layout, objects, grid, '4,2'), null);
  assert.equal(planStationRotation(layout, objects, grid, '1,2'), null);
  assert.equal(planStationRotation(layout, objects, grid, '2,2'), null);
});

test('rotates every floor fixture in place and keeps its angle when moved', () => {
  const target = cell(2, 2);
  const key = cellKey(target);

  for (const kind of ['rack', 'receiving', 'shipping']) {
    let layout = place(new Map(), kind, target);

    for (const quarterTurns of [1, 2, 3, 0]) {
      const rotation = planObjectRotation(
        layout,
        getSceneObjects(layout),
        grid,
        key,
      );
      assert.ok(rotation);
      layout = applyLayoutChange(layout, rotation);
      assert.deepEqual(getSceneObjects(layout).get(key), {
        kind,
        ...target,
        quarterTurns,
      });
    }

    const rotation = planObjectRotation(
      layout,
      getSceneObjects(layout),
      grid,
      key,
    );
    layout = applyLayoutChange(layout, rotation);
    const destination = cell(1, 1);
    const movement = plan(
      layout,
      getSceneObjects(layout).get(key),
      destination,
      key,
    );
    assert.ok(movement);
    assert.deepEqual(movement.elements, [
      { kind, ...destination, quarterTurns: 1 },
    ]);
  }
});

test('rotates a robot around its own station and leaves an occupied side alone', () => {
  let layout = place(new Map(), 'charger', cell(2, 2));
  layout = place(layout, 'charger', cell(4, 2));
  layout = place(layout, 'robot', cell(2, 1));
  layout = place(layout, 'rack', cell(2, 3));
  const rotation = planObjectRotation(
    layout,
    getSceneObjects(layout),
    grid,
    '2,1',
  );
  assert.ok(rotation);
  layout = applyLayoutChange(layout, rotation);
  const objects = getSceneObjects(layout);

  assert.equal(objects.has('2,1'), false);
  assert.equal(objects.get('3,2').contactSide, 'west');
  assert.deepEqual(objects.get('2,2').contactSides, ['east']);
  assert.deepEqual(objects.get('4,2').contactSides, []);
  assert.equal(planObjectRotation(layout, objects, grid, '3,2'), null);
});

test('removes ordinary objects and keeps a station until its robots are removed', () => {
  let layout = place(new Map(), 'charger', cell(2, 2));
  layout = place(layout, 'robot', cell(2, 1));
  layout = place(layout, 'robot', cell(3, 2));
  layout = place(layout, 'rack', cell(0, 0));
  const remove = (key) =>
    applyLayoutChange(
      layout,
      planObjectRemoval(layout, getSceneObjects(layout), key),
    );

  assert.equal(remove('4,4'), layout);
  assert.equal(remove('2,2'), layout);
  layout = remove('0,0');
  assert.equal(getSceneObjects(layout).has('0,0'), false);
  layout = remove('2,1');
  assert.deepEqual(getSceneObjects(layout).get('2,2').contactSides, ['east']);
  assert.equal(getSceneObjects(layout).has('2,1'), false);
  assert.equal(remove('2,2'), layout);

  layout = remove('3,2');
  layout = remove('2,2');
  assert.equal(getSceneObjects(layout).size, 0);
});
