// story.js — items, documents, objectives and the hint system
(function () {
  'use strict';
  const G = window.G;
  const f = (n) => G.flag(n);
  const has = (i) => G.inv.has(i);

  G.ITEMS = {
    spoon: { name: 'Filed-Down Spoon', desc: 'Tom\'s old spoon. He filed the handle flat &mdash; "handy for more than soup," he used to say.', model: 'spoon', iconRot: [0.9, 0.6, 0] },
    cup: { name: 'Tin Cup', desc: 'Standard issue and dented. Holds about a pint.', model: 'cup', iconRot: [0.4, -0.5, 0] },
    cup_water: { name: 'Cup of Water', desc: 'Filled to the brim with ice-cold tap water. Careful now.', model: 'cupWater', iconRot: [0.6, -0.5, 0] },
    flashlight_dead: { name: 'Flashlight (empty)', desc: 'A heavy guard-issue torch. The battery compartment is empty.', model: 'flashlight', iconRot: [0.3, 0.5, 0.3] },
    flashlight: { name: 'Flashlight', desc: 'A heavy guard-issue torch, loaded with the radio\'s D-cells. Press <b>F</b> to switch it on or off.', model: 'flashlight', iconRot: [0.3, 0.5, 0.3] },
    batteries: { name: 'D-Cell Batteries', desc: 'Two fat D-cells, still warm from the guard\'s radio.', model: 'batteries', iconRot: [0.4, 0.3, 0] },
    gate_key: { name: 'C-Block Gate Key', desc: 'A brass key on a red tag stamped <b>C-GATE</b>.', model: 'key', iconRot: [0.2, 0.3, 0.2] },
    jerrycan: { name: 'Jerrycan (empty)', desc: 'A five-gallon fuel can. Empty, by the hollow sound of it.', model: 'jerrycan', iconRot: [0.3, -0.7, 0] },
    jerrycan_full: { name: 'Jerrycan (diesel)', desc: 'Sloshing with diesel from the store drum. Heavy.', model: 'jerrycan', iconRot: [0.3, -0.7, 0] },
    boltcutters: { name: 'Bolt Cutters', desc: 'Two feet of hardened steel. They\'ll bite through most chains.', model: 'boltcutters', iconRot: [0.3, 0.2, 0.5] },
  };

  const staff = (notes) => {
    // treble staff; note positions: E4=60 ... F5=20 (y), spacing 5 per step
    const Y = { E4: 60, F4: 55, G4: 50, A4: 45, B4: 40, C5: 35, D5: 30, E5: 25, F5: 20 };
    let s = '<svg viewBox="0 0 520 110" width="100%" style="margin:6px 0 2px">';
    for (let k = 0; k < 5; k++) s += `<line x1="10" x2="510" y1="${20 + k * 10}" y2="${20 + k * 10}" stroke="#333" stroke-width="1.3"/>`;
    s += '<text x="14" y="62" font-size="58" font-family="serif" fill="#222">&#119070;</text>';
    notes.forEach((n, i) => {
      const x = 90 + i * 60, y = Y[n];
      s += `<ellipse cx="${x}" cy="${y}" rx="7" ry="5.2" transform="rotate(-18 ${x} ${y})" fill="#1b1b1b"/><line x1="${x + 6.5}" x2="${x + 6.5}" y1="${y}" y2="${y - 32}" stroke="#1b1b1b" stroke-width="1.6"/>`;
      s += `<text x="${x - 8}" y="${98}" font-family="Caveat, cursive" font-size="26" fill="#555">${n[0]}</text>`;
    });
    return s + '</svg>';
  };

  G.DOCS = {
    letter1: {
      title: 'Tom\'s Letter', kind: 'Letter', style: '',
      html: `<p>Kid,</p>
<p>If you're reading this, they carted me off to the infirmary before the storm hit. My ticker, the doc says. Doesn't matter. The plan still works, and tonight's the night &mdash; you'll hear it on the roof.</p>
<p>Our door lock runs on the same circuit as that busted socket down by the foot of the bunk. Short the circuit and the bolt lets go &mdash; "fail-safe," the screws call it. Two loose screws hold the plate. Anything flat will turn them. Water does the rest.</p>
<p>After that, follow my notes. I left them where only you'd think to look.</p>
<p>Burn this. (You won't. You never listen.)</p>
<p class="sig">&mdash; Tom</p>
<p><i>P.S. Loose brick under the window. I drew you a map.</i></p>`,
    },
    map: { title: 'Tom\'s Map', kind: 'Map', style: 'photo', html: () => G.ui.mapSVG() },
    guardlog: {
      title: 'Guard Log &mdash; C Block', kind: 'Logbook', style: 'log',
      html: `<h2 style="margin:0 0 10px;font-size:18px">C BLOCK &mdash; NIGHT SHIFT &mdash; OCT 13 1971 &mdash; Off. F. Miller</h2>
<p>21:00 &nbsp;Lights out. Count correct: 22.</p>
<p>21:40 &nbsp;C-15 (Mack) complaining about the roof leak again. Told him to write his congressman.</p>
<p>22:15 &nbsp;Storm warning from the mainland. Supply boat cancelled until Friday.</p>
<p>22:50 &nbsp;Harlan (C-14) taken to the infirmary. Heart. Doc says he'll keep till morning.</p>
<p>23:05 &nbsp;Gen B day tank DRY &mdash; reported to maintenance AGAIN. Plenty of diesel in the store drum. Apparently nobody's job.</p>
<p>23:30 &nbsp;Power dipping everywhere. Hall lights flickering.</p>
<p class="hand">Yard floods are on Gen B too. If the mains go tonight the whole yard goes dark. Terrific. &mdash; F.M.</p>`,
    },
    sticky: {
      title: 'Sticky Note', kind: 'Note', style: 'sticky',
      html: `<p>Frank &mdash;</p><p>Key cabinet combo is <b>Lily's birthday</b>. Month first.</p><p>DON'T write it down again!!</p><p class="sig">&mdash; Sgt. R.</p>`,
    },
    photo: {
      title: 'Photograph of Lily', kind: 'Photograph', style: 'photo',
      html: `<p style="font-size:34px;margin-top:10px">Lily &mdash; 7 today!</p><p style="font-size:30px">Sept. 14th</p><p>Love you, Daddy xx</p><p style="font-family:Oswald;font-size:13px;letter-spacing:.2em;color:#777;margin-top:30px">(WRITTEN ON THE BACK OF THE PHOTO)</p>`,
    },
    memo: {
      title: 'Memo from the Warden', kind: 'Memo', style: 'typed',
      html: `<h2>Office of the Warden &mdash; Memorandum</h2>
<p>TO: All custodial staff<br>RE: Chapel hours</p>
<p>Effective immediately, the chapel is to be <b>chained after evening service</b>. Father Brennan's so-called "storm vigils" are suspended until further notice.</p>
<p>Staff are reminded that the searchlight on the north tower is to remain manned at all times during inclement weather. The yard floodlights draw from Generator B and are NOT to be relied upon.</p>
<p>Any inmate found outside his cell after lights out will be placed in segregation for no less than ninety days.</p>
<p class="sig">H. T. Pryce, Warden</p>`,
    },
    clipping: {
      title: 'Newspaper Clipping', kind: 'Newspaper', style: 'news',
      html: `<div class="mast">The Harbor Courier &middot; March 11, 1969</div>
<h2>No Escape From The Rock</h2>
<div class="deck">Warden declares island prison "tighter than a drum"</div>
<div class="cols"><p>GALLOWS ROCK &mdash; Warden H.&nbsp;T. Pryce told reporters Tuesday that no inmate has escaped the island penitentiary in its thirty-six years of federal service, "and none ever will."</p>
<p>"Eleven miles of cold water does half my job," Pryce said. "My officers do the other half."</p>
<p>The warden dismissed persistent rumors of passages left over from the island's days as a coastal fort. "The old fort tunnels were filled with concrete in '31. Every last one of them."</p>
<p>Asked about the prison chapel &mdash; the only building on the island that survives from the fort era &mdash; Pryce smiled. "Father Brennan keeps the Lord's house. I keep everything else."</p></div>`,
    },
    letter2: {
      title: 'Tom\'s Second Note', kind: 'Letter', style: '',
      html: `<p>Kid &mdash;</p>
<p>The yard shutter runs off <b>Generator B</b>, same as half this dump. Her day tank's been dry all week (I told Miller, much good it did). There's diesel in the drum in the stores, and a jerrycan knocking about near it.</p>
<p>Fill her up and start her proper &mdash; the card on the wall tells you how. Then mind the breakers. Old Gen B can't carry the whole house. Throw the wrong ones and she'll trip.</p>
<p>While you're in the stores, take the big <b>bolt cutters</b> off the pegboard. You'll want them at the chapel.</p>
<p class="sig">&mdash; T.</p>`,
    },
    genmanual: {
      title: 'Generator B &mdash; Start Card', kind: 'Instructions', style: 'card',
      html: `<h2>GENERATOR B &mdash; COLD START</h2>
<ol><li>Check day tank level. Refill from store drum if below &frac14;.</li>
<li><b>FUEL PUMP</b> switch &rarr; ON.</li>
<li>Hold <b>GLOW PLUG</b> button until the lamp turns <b>GREEN</b> (approx. 4 sec).</li>
<li>Press <b>START</b>.</li>
<li>Close the <b>MAIN BREAKER</b> on the distribution panel.</li></ol>
<div class="warn">WARNING: MAXIMUM CONTINUOUS LOAD 60 kW. Shed non-essential circuits BEFORE closing the main breaker or the unit WILL trip.</div>`,
    },
    letter3: {
      title: 'Tom\'s Third Note', kind: 'Letter', style: '',
      html: `<p>You're out. Good lad.</p>
<p>Kowalski works the searchlight on the north tower. Creature of habit &mdash; the beam sweeps the yard the same way every time. Watch it. Count it. Move when it's looking the other way, and keep low behind the carts and crates. It can't see what it can't touch.</p>
<p>Don't use your torch out there. Might as well send up a flare.</p>
<p>The chapel is across the yard, on the east side. Father Brennan chains it at night.</p>
<p class="sig">&mdash; T.</p>`,
    },
    letter4: {
      title: 'Tom\'s Last Note', kind: 'Letter', style: '',
      html: `<p>Kid,</p>
<p>You made it this far. I knew you would.</p>
<p>Father Brennan let me play this old organ on Sundays. Only he and I knew it plays more than hymns. Back when this rock was a fort, smugglers cut a passage under the altar &mdash; and some clever devil rigged the latch to the organ.</p>
<p>Play <b>my tune</b>. The one I was always whistling &mdash; you've heard it a thousand times. If you've got a tin ear, I wrote it in the <b>hymnal on the lectern</b>.</p>
<p>The passage runs down to the sea cave. My brother Eddie brought his boat in there three nights back. It was meant for me. It's yours now. Don't argue.</p>
<p class="sig">&mdash; Tom</p>`,
    },
    hymnal: {
      title: 'Hymnal, No. 318', kind: 'Hymnal', style: 'hymn',
      html: `<h2>No. 318 &mdash; Eternal Father, Strong to Save</h2>
<p style="text-align:center;font-style:italic">Eternal Father, strong to save,<br>Whose arm hath bound the restless wave&hellip;</p>
<p class="pencil" style="margin:18px 0 0">Not the hymn &mdash; <u>my</u> tune. Middle keys. &mdash; T.</p>
${staff(['A4', 'C5', 'E5', 'D5', 'C5', 'B4', 'A4'])}
<p class="pencil" style="text-align:center;letter-spacing:.2em">A &nbsp;C &nbsp;E &nbsp;D &nbsp;C &nbsp;B &nbsp;A</p>`,
    },
    brennan: {
      title: 'Father Brennan\'s Diary', kind: 'Diary', style: 'diary',
      html: `<p><b>Sept. 30th.</b> Thomas asked me again about the old passage. I told him it was sealed long ago. God forgive me, he knows I lie badly.</p>
<p><b>Oct. 4th.</b> He has a brother on the mainland with a boat. He says he is too old and too sick to go himself, but there is a young man in his block who does not belong here. "Wrong place, wrong time, wrong lawyer," as Thomas puts it.</p>
<p><b>Oct. 9th.</b> I shall leave the candles burning on stormy nights. A priest may keep a vigil. What happens in the Lord's house by candlelight is between the Lord and whoever is in it.</p>`,
    },
    diary1868: {
      title: 'Water-Stained Journal', kind: 'Journal, 1868', style: 'diary',
      html: `<p>&hellip;the 3rd of November, 1868. The tide came in faster than we reckoned and the cave is full of Revenue men. I have come back up the passage to wait them out.</p>
<p>The sea door will not open for me in the dark. My lamp is spent and I cannot see the keeper's marks.</p>
<p>The keeper was a careful man. He cut his marks along the way: <b>the first by the stair, the second where the rum was kept, the third where I now rest.</b> Set the wheels in their order and the door will give.</p>
<p>I am very cold. If some soul finds this, tell Margaret at&hellip;</p>`,
    },
    eddie: {
      title: 'Note in the Boat', kind: 'Letter', style: '',
      html: `<p>Tom &mdash;</p>
<p>Tank's full. <b>Fuel valve</b> on the side of the motor &mdash; turn it ON first, you old fool. The <b>choke</b> sticks, so pull it out, give her <b>three good pulls</b> on the cord, then push the choke back in or she'll drown.</p>
<p><b>Untie</b> her from the dock, put her in gear and point her east round the point. Crescent Bay by dawn. I'll be waiting with the truck and a thermos.</p>
<p>Thirty years, brother. Let's go home.</p>
<p class="sig">&mdash; Eddie</p>`,
    },
  };

  // ------------------------------------------------------------------ objectives
  const OBJ = [
    {
      id: 'cell', text: 'Find a way out of your cell.', done: () => f('cell_open'),
      hint: (lv) => {
        if (!f('read_letter1')) return lv < 1 ? 'I always kept my secrets in my favourite book. The one about the fella who escapes the island prison.' : 'Check the books on the shelf above the desk &mdash; <i>The Count of Monte Cristo</i>.';
        if (!f('socket_open')) return has('spoon') ? 'Use the spoon on that socket plate at the foot of your bunk.' : 'My old spoon is on your supper tray. The handle is filed flat &mdash; perfect for screws.';
        if (!has('cup_water')) return has('cup') ? 'Fill the cup at the sink.' : 'Your tin cup is sitting on the sink.';
        return 'Water, meet wires. Pour the cup onto the socket.';
      },
    },
    {
      id: 'gate', text: 'Get through the C-Block gate.', done: () => f('gate_open'),
      hint: (lv) => {
        if (has('flashlight_dead') && !has('batteries') && !f('radio_taken') && lv > 0) return 'That torch needs D-cells. The guard\'s radio runs on the same.';
        if (!has('gate_key')) {
          if (!f('visited_guard')) return 'Miller\'s station is at the end of the corridor. He left in a hurry.';
          if (!f('cabinet_open')) {
            if (!f('photo_back')) return lv < 1 ? 'The key cabinet has a combination lock. Miller\'s the sentimental type &mdash; read the notes on his desk.' : 'The sticky note says it\'s Lily\'s birthday. There\'s a photo of her on the desk &mdash; turn it over.';
            return lv < 1 ? 'Lily\'s birthday, month first. Set the four dials on the key cabinet.' : 'September 14th. Month first: <b>0 9 1 4</b>.';
          }
          return 'The gate key hangs in the open cabinet.';
        }
        return 'Use the key on the barred gate at the east end of the corridor.';
      },
    },
    {
      id: 'power', text: 'Restore power to the yard shutter.', done: () => f('shutter_power'),
      hint: (lv) => {
        if (!f('gen_fueled')) {
          if (has('jerrycan_full')) return 'Pour the diesel into Generator B\'s day tank &mdash; the filler cap is on the tank beside the engine.';
          if (has('jerrycan')) return 'Fill the jerrycan from the red diesel drum in the stores.';
          if (!f('visited_maint')) return 'The generator\'s down the maintenance corridor &mdash; north door off the hall.';
          return 'The day tank is dry. There\'s a jerrycan in the stores, next to the diesel drum.';
        }
        if (!f('gen_running')) return lv < 1 ? 'Follow the start card on the wall.' : 'Fuel pump ON. Hold the glow plug button until the lamp turns green. Then START.';
        return lv < 1 ? 'Mind the breakers. The shutter motor must be on, and the total load under 60 kW when you close the main.' : 'Switch OFF the yard floods and the cold store, switch ON the shutter motor, then close the MAIN breaker. The locked ones stay as they are.';
      },
    },
    {
      id: 'shutter', text: 'Open the yard shutter in the hall.', done: () => f('shutter_open'),
      hint: () => 'The control box sits beside the big roll-up shutter on the east wall of the hall. Press the green button.',
    },
    {
      id: 'yard', text: 'Cross the yard to the chapel.', done: () => f('chapel_open'),
      hint: (lv) => {
        if (!has('boltcutters')) return 'The chapel\'s chained. The bolt cutters are on the pegboard in the maintenance stores.';
        if (G.world.current && G.world.current.name === 'yard' && lv > 0) return 'Wait behind cover for the beam to pass, then dash to the next cover. Crouch (C) behind low things. Torch off.';
        return 'Watch the searchlight. Move when it\'s looking away and stay behind cover. The chapel door is on the far east side.';
      },
    },
    {
      id: 'organ', text: 'Find Tom\'s way out in the chapel.', done: () => f('altar_open'),
      hint: (lv) => {
        if (!f('read_letter4')) return 'I left you a note on the organ bench.';
        if (!f('read_hymnal') && lv < 1) return 'Play my tune on the organ. If you can\'t remember it, it\'s in the hymnal on the lectern.';
        return 'Play <b>A &ndash; C &ndash; E &ndash; D &ndash; C &ndash; B &ndash; A</b> on the organ. The keys are labelled.';
      },
    },
    {
      id: 'tunnel', text: 'Follow the smugglers\' passage to the sea.', done: () => f('seadoor_open'),
      hint: (lv) => {
        if (lv < 1) return 'That door wants three symbols. The old smuggler\'s journal says the keeper cut his marks along the passage.';
        if (lv < 2) return 'One mark by the stairs, one in the rum alcove behind the barrels, one near the poor soul by the wall. Set the wheels in order: I, II, III.';
        return 'I &mdash; the moon. II &mdash; the anchor. III &mdash; the star.';
      },
    },
    {
      id: 'boat', text: 'Start Eddie\'s boat and get out of here!', done: () => f('escaped'),
      hint: () => 'Eddie\'s way: fuel valve ON, choke OUT, three pulls on the cord, choke back IN. Untie the rope, then throttle to FORWARD.',
    },
  ];
  const S = (G.story = { OBJ });
  S.current = () => OBJ.find((o) => !o.done()) || null;
  S.currentObjectiveText = () => { const o = S.current(); return o ? o.text : 'Escape.'; };
  S.hint = function () {
    const o = S.current();
    if (!o) return;
    const lv = G.state.hintLevel[o.id] || 0;
    G.state.hintLevel[o.id] = lv + 1;
    G.state.stats.hints++;
    G.ui.hint(o.hint(lv));
  };
  let lastObj = null;
  S.checkObjective = function (silent) {
    const o = S.current();
    const id = o ? o.id : 'done';
    if (id !== lastObj) {
      lastObj = id;
      if (o && !silent) G.ui.objective(o.text);
      else if (o) G.ui.objective(o.text, false);
    }
  };
  G.on('flag', () => S.checkObjective());
})();
