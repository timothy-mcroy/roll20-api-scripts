// Github:   https://github.com/shdwjk/Roll20API/blob/master/FateDots/FateDots.js
// By:       The Aaron, Arcane Scriptomancer
// Contact:  https://app.roll20.net/users/104025/the-aaron

var FateDots = FateDots || (function () {
        'use strict';
        var version = '0.2.1',
            lastUpdate = 1427604248,
            schemaVersion = 0.4,
            statuses = new Set([
                'blue',
                'green',
                'brown',
                'purple',
                'pink',
                'yellow',
                'skull',
                'sleepy',
                'half-heart',
                'half-haze',
                'interdiction',
                'snail',
                'lightning-helix',
                'spanner',
                'chained-heart',
                'chemical-bolt',
                'death-zone',
                'drink-me',
                'edge-crack',
                'ninja-mask',
                'stopwatch',
                'fishing-net',
                'overdrive',
                'strong',
                'fist',
                'padlock',
                'three-leaves',
                'fluffy-wing',
                'pummeled',
                'tread',
                'arrowed',
                'aura',
                'back-pain',
                'black-flag',
                'bleeding-eye',
                'bolt-shield',
                'broken-heart',
                'cobweb',
                'broken-shield',
                'flying-flag',
                'radioactive',
                'trophy',
                'broken-skull',
                'frozen-orb',
                'rolling-bomb',
                'white-tower',
                'grab',
                'screaming',
                'grenade',
                'sentry-gun',
                'all-for-one',
                'angel-outfit',
                'archery-target'
            ]),


            showHelp = function () {
                var msg = '/w gm '
                    + '<div style="border: 1px solid black; background-color: white; padding: 3px 3px;">'
                    + '<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 130%;">'
                    + 'FateDots v' + version
                    + '<div style="clear: both"></div>'
                    + '</div>'
                    + '<div style="padding-left:10px;margin-bottom:3px;">'
                    + '<p>Allows statues to be used like Fate stress boxes by repeating them.</p>'
                    + '<p>By default, Blue and Red will be treated specially.  Assigning a number to them will cause them to be duplicated that many times, and numbered in decreasing order.  Changing the number will change the number of pips that appear.</p>'
                    + '</div>'
                    + '<b>Commands</b>'
                    + '<div style="padding-left:10px;"><b><span style="font-family: serif;">' + _.escape('!fate-dots <[+|-|=]Status Marker>')+ '</span></b>'
                    + '<div style="padding-left: 10px;padding-right:20px">'
                    + 'Adds or removes a status to be treated as a multibox.'
                    + '</div>'
                    + '<p><u>Available Status Markers:</u></p>';


                for (var status of statuses) {
                    msg += '<div style="width: 130px; padding: 0px 3px;float: left;">' + status + '</div>';
                }

                msg += '<div style="clear:both;">' + _.escape(' ') + '</div>'

                    + '<p>Adding purple, setting mental, removing blue.</p>'
                    + '<div style="padding-left: 10px;padding-right:20px">'
                    + '<pre style="white-space:normal;word-break:normal;word-wrap:normal;">'
                    + '!fate-dots +3purple =4mental -2blue'
                    + '</pre>'

                    + '<p>Renaming mental to money</p>'
                    + '<pre style="white-space:normal;word-break:normal;word-wrap:normal;">'
                    + '!fate-dots rename mental money'
                    + '</pre>'

                    + '<p>Finding current aliases</p>'
                    + '<pre style="white-space:normal;word-break:normal;word-wrap:normal;">'
                    + '!fate-dots list'
                    + '</pre>'
                    + '</div>'
                    + '</div>'
                    + '</div>';
                sendChat('FateDots', msg);

            },

            updateAllSelected = function (statusMarker, change, selected) {
                for (var i in selected) {
                    var selected = selected[i];
                    var graphic = getObj(selected._type, selected._id);
                    var oldCount = graphic.get(statusMarker) | 0;
                    graphic.set(statusMarker, oldCount + change);
                }
            },
            assignAllSelected = function (statusMarker, change, selected) {
                for (var i in selected) {
                    var selected = selected[i];
                    var graphic = getObj(selected._type, selected._id);
                    graphic.set(statusMarker, change);
                }
            },
            rename = function (args) {
                var sendRenameError = function () {
                    showHelp()
                    sendChat('FateDots', 'You must provide a main status bar name. This can be [' +Object.keys(state.FateDots.literalAliases).join('|') + '] '
                        + 'or ['+ Object.keys(state.FateDots.userAliases).join('|'))
                };
                if (args.length !== 2) {
                    return sendRenameError()
                }
                var mainStatusBarName = args[0];
                var newStatusBarAlias = args[1];
                if (state.FateDots.userAliases.hasOwnProperty(mainStatusBarName)) {
                    var tmp = state.FateDots.userAliases[mainStatusBarName];
                    delete state.FateDots.userAliases[mainStatusBarName];
                    mainStatusBarName = tmp;
                }
                if (!state.FateDots.literalAliases.hasOwnProperty(mainStatusBarName)) {
                    return sendRenameError()
                }
                state.FateDots.userAliases[newStatusBarAlias] = mainStatusBarName;

            },
            handleInput = function (msg) {

                if ("api" !== msg.type || !playerIsGM(msg.playerid)) {
                    return;
                }
                var args;

                args = msg.content.split(/\s+/g);

                var firstArg = args.shift();
                if (firstArg !== '!fate-dots') {
                    return;
                }
                if (args[0] === "rename") {
                    args.shift();
                    return rename(args)
                } else if (args[0] === "list") {
                    var aliasListing = [];
                    for (var key in state.FateDots.userAliases){
                        aliasListing.push( key + " : " + state.FateDots.userAliases[key]);
                    }
                    return sendChat('FateDots', '/w gm User aliases are ' + aliasListing.join(', '))
                } else if (args[0] === "help") {
                    return showHelp();

                }
                _.each(args, function (s) {
                    if (!s) {
                        return;
                    }
                    var expectedForm = /([+-=])([0-9]+)(\w+)/g;
                    var matches = expectedForm.exec(s);
                    if (!matches) {
                        sendChat('FateDots', '/w gm We couldn\'t parse {'+s+'}' );
                        return;
                    }
                    var toAdd = matches[1] == '+';
                    var assignValue = matches[1] == '=';
                    var givenNumber = matches[2] | 0;
                    var statusToChange = matches[3];
                    var isDefaultSymbol = statuses.has(statusToChange);
                    var isUserSymbol = state.FateDots.userAliases.hasOwnProperty(statusToChange);
                    if (!(isUserSymbol || isDefaultSymbol)) {
                        showHelp();
                        sendChat('FateDots', '/w gm Can\'t detect what icon you want to update! ' +statusToChange +' is not a known icon');
                        return;
                    }
                    var delta = toAdd ? givenNumber : givenNumber * -1;
                    var symbolName = 'UnknownSymbol';
                    if (isDefaultSymbol) {
                        symbolName = 'status_' + statusToChange
                    } else if (isUserSymbol) {
                        var bigCircleToUpdate = state.FateDots.userAliases[statusToChange];
                        symbolName = state.FateDots.literalAliases[bigCircleToUpdate]
                    }
                    if (assignValue) {
                        assignAllSelected(symbolName, givenNumber, msg.selected);
                    } else {
                        updateAllSelected(symbolName, delta, msg.selected);
                    }

                });


            },


            checkInstall = function () {
                log('-=> FateDots v' + version + ' <=-  [' + (new Date(lastUpdate * 1000)) + ']');

                if (!_.has(state, 'FateDots') || state.FateDots.version !== schemaVersion) {
                    log('  > Updating Schema to v' + schemaVersion + ' <');

                    state.FateDots = {
                        version: schemaVersion,
                        literalAliases: {
                            'green': 'bar1_value',
                            'blue': 'bar2_value',
                            'red': 'bar3_value'
                        },
                        userAliases: {
                            'mental': 'blue',
                            'physical': 'red',
                            'misc': 'green'
                        },
                        statuses: ['blue', 'red']
                    };
                    log(state);
                }
            },

            registerEventHandlers = function () {
                on('chat:message', handleInput);
            };

        return {
            CheckInstall: checkInstall,
            RegisterEventHandlers: registerEventHandlers
        };
    }());

on("ready", function () {
    'use strict';

    FateDots.CheckInstall();
    FateDots.RegisterEventHandlers();
});
