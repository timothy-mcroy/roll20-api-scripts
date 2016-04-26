(function() {

  // A mapping of saving throw short names to their attribute names.
  var saveNames = {
    'str': 'strength_save_bonus',
    'dex': 'dexterity_save_bonus',
    'con': 'constitution_save_bonus',
    'int': 'intelligence_save_bonus',
    'wis': 'wisdom_save_bonus',
    'cha': 'charisma_save_bonus'
  };

  /**
   * Asynchronously gets the value of a character sheet attribute.
   * @param  {Character}   character
   * @param  {string}   attr
   * @param  {Function} callback
   *         The callback takes one parameter: the value of the attribute.
   */
  function getSheetAttr(character, attr, callback) {
    try {
      rollAsync('@{' + character.get('name') + '|' + attr + '}', function(roll) {
        callback(roll.total);
      });
    }
    catch(err) {
      callback(undefined);
    }
  }

  /**
   * Produces HTML for a padded table row.
   * @param  {string} innerHTML
   * @param  {string} style
   * @return {string}
   */
  function htmlPaddedRow(innerHTML, style) {
    return '<tr><td style="padding: 1px 1em; ' + style + '">' + innerHTML + '</td></tr>';
  }


  /**
   * Produces HTML for a faked inline roll result.
   * @param  {int} result
   * @param  {string} expr
   * @return {string}
   */
  function htmlRollResult(result, expr) {
    var d20 = result.rolls[0].results[0].v;

    var style = 'background-color: #FEF68E; cursor: help; font-size: 1.1em; font-weight: bold; padding: 0 3px;';
    if(d20 === 20)
      style += 'border: 2px solid #3FB315;';
    if(d20 === 1)
      style += 'border: 2px solid #B31515';

    return '<span title="' + expr + '" style="' + style + '">' + result.total + '</span>';
  }

  /**
   * Asynchronously rolls a dice roll expression and returns the result's total in
   * a callback. The result is undefined if an invalid expression is given.
   * @param  {string} expr
   * @return {int}
   */
  function rollAsync(expr, callback) {
    sendChat('ItsATrap-DnD5', '/w gm [[' + expr + ']]', function(msg) {
      try {
        var results = msg[0].inlinerolls[0].results;
        callback(results);
      }
      catch(err) {
        callback(undefined);
      }
    });
  }


  /**
   * Sends an HTML-stylized message about an activated trap.
   * @param  {object} data
   */
  function sendHtmlTrapMessage(data) {
    var tableStyle = [
      'background-color: #fff;',
      'border: solid 1px #000;',
      'border-collapse: separate;',
      'border-radius: 10px;',
      'overflow: hidden;',
      'width: 100%;'
    ].join(' ');
    var headerStyle = [
      'background-color: #000;',
      'color: #fff;',
      'font-weight: bold;'
    ].join(' ');
    var messageStyle = [
      'background-color: #ccc;',
      'font-style: italic;'
    ].join(' ');

    // Start message
    var msg = '<table style="' + tableStyle + '">';
    msg += "<thead><tr style='" + headerStyle + "'><th>IT'S A TRAP!!!</th></tr></thead>";
    msg += '<tbody>';

    // Add the flavor message.
    msg += htmlPaddedRow(data.message, messageStyle);

    // Add the attack roll message.
    if(data.attack) {
      var rollHtml = htmlRollResult(data.attack.roll,
        '1d20 + ' + data.attack.bonus);
      msg += htmlPaddedRow('<span style="font-weight: bold;">Attack roll:</span> ' + rollHtml + ' vs AC ' + data.attack.ac);
    }

    // Add the saving throw message.
    if(data.save) {
      var rollHtml = htmlRollResult(data.save.roll, '1d20 + ' + data.save.bonus);
      var saveMsg = '<span style="font-weight: bold;">' + data.save.name.toUpperCase() + ' save:</span> ' + rollHtml
         + ' vs DC ' + data.save.dc;

      // If the save result is a secret, whisper it to the GM.
      if(data.hideSave)
        sendChat('Admiral Ackbar', '/w gm ' + saveMsg);
      else
        msg += htmlPaddedRow(saveMsg);
    }

    // Add the hit/miss message.
    if(data.trapHit) {
      var resultHtml = '<span style="color: #f00; font-weight: bold;">HIT! </span>';
      if(data.damage)
        resultHtml += 'Damage: [[' + data.damage + ']]';
      else
        resultHtml += data.character.get('name') + ' falls prey to the trap\'s effects!';
      msg += htmlPaddedRow(resultHtml);
    }
    else {
      var resultHtml = '<span style="color: #620; font-weight: bold;">MISS! </span>';
      if(data.damage && data.missHalf)
        resultHtml += 'Half damage: [[floor((' + data.damage + ')/2)]].';
      msg += htmlPaddedRow(resultHtml);
    }

    // End message.
    msg += '</tbody></table>';

    // Send the HTML message to the chat.
    sendChat('Admiral Ackbar', msg);
  }


  /**
   * A theme for the 5th Edition OGL character sheet.
   * @implements ItsATrap#TrapTheme
   */
  var theme = {
    name: '5E-OGL',

    /**
     * Display the raw message and play the effect's sound.
     * @inheritdoc
     */
    activateEffect: function(effect) {
      var charToken = getObj('graphic', effect.victimId);
      var character = getObj('character', charToken.get('represents'));

      var msgData = {
        character: character,
        damage: effect.damage,
        hideSave: effect.hideSave,
        message: effect.message,
        missHalf: effect.missHalf
      };

      // Remind the GM about the trap's effects.
      if(effect.notes)
        sendChat('Admiral Ackbar', '/w gm Trap Effects:<br/> ' + effect.notes);

      // Automate trap attack/save mechanics.
      if(character) {

        // Does the trap make an attack vs AC?
        if(effect.attack) {
          getSheetAttr(character, 'ac', function(ac) {
            rollAsync('1d20 + ' + effect.attack, function(atkRoll) {
              msgData.attack = {
                ac: ac,
                bonus: effect.attack,
                roll: atkRoll
              };
              msgData.trapHit = atkRoll.total >= ac;
              sendHtmlTrapMessage(msgData);
            });
          });
        }

        // Does the trap require a saving throw?
        else if(effect.save && effect.saveDC) {
          getSheetAttr(character, saveNames[effect.save], function(saveBonus) {
            rollAsync('1d20 + ' + saveBonus, function(saveRoll) {
              msgData.save = {
                bonus: saveBonus,
                dc: effect.saveDC,
                name: effect.save,
                roll: saveRoll
              };
              msgData.trapHit = saveRoll.total < effect.saveDC;

              sendHtmlTrapMessage(msgData);
            });
          });
        }

        // If neither, just send the basic message.
        else
          sendHtmlTrapMessage(msgData);
      }
      else
        sendHtmlTrapMessage(msgData);

      // If the effect has a sound, try to play it.
      ItsATrap.playEffectSound(effect);

      // If the effect has an api command, execute it.
      ItsATrap.executeTrapCommand(effect);
    },

    /**
     * Display a message if the character is within 5 units of the trap.
     * @inheritdoc
     */
    passiveSearch: function(trap, charToken) {
      var effect = ItsATrap.getTrapEffect(charToken, trap);
      var character = getObj('character', charToken.get('represents'));

      // Only do passive search for traps that have a spotDC.
      if(effect.spotDC && character) {

        // If the character's passive wisdom beats the spot DC, then
        // display a message and mark the trap's trigger area.
        getSheetAttr(character, 'passive_wisdom', function(passWis) {
          if(passWis >= effect.spotDC) {
            var noticeHtml = "<span style='font-weight: bold;'>IT'S A TRAP!!!</span><br/>" +
              character.get('name') + ' notices a trap: <br/>' + trap.get('name')
            ItsATrap.noticeTrap(trap, noticeHtml);
          }
        });
      }
    }
  };

  // Register the theme with ItsATrap.
  var register = setInterval(function() {
    if(ItsATrap) {
      clearInterval(register);
      ItsATrap.registerTheme(theme);
    }
  }, 1000);
})();