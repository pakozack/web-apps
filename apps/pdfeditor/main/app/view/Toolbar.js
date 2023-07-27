/*
 * (c) Copyright Ascensio System SIA 2010-2023
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at 20A-6 Ernesta Birznieka-Upish
 * street, Riga, Latvia, EU, LV-1050.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */
/**
 *  Toolbar.js
 *
 *  Toolbar view
 *
 *  Created by Julia Radzhabova on 05/04/23
 *  Copyright (c) 2023 Ascensio System SIA. All rights reserved.
 *
 */
if (Common === undefined)
    var Common = {};

define([
    'jquery',
    'underscore',
    'backbone',
    'text!pdfeditor/main/app/template/Toolbar.template',
    'common/main/lib/collection/Fonts',
    'common/main/lib/component/Button',
    'common/main/lib/component/ColorButton',
    'common/main/lib/component/ComboBox',
    'common/main/lib/component/DataView',
    'common/main/lib/component/ColorPalette',
    'common/main/lib/component/ThemeColorPalette',
    'common/main/lib/component/Menu',
    'common/main/lib/component/Window',
    'common/main/lib/component/ComboBoxFonts',
    'common/main/lib/component/ComboDataView'
    ,'common/main/lib/component/SynchronizeTip'
    ,'common/main/lib/component/Mixtbar'
], function ($, _, Backbone, template) {
    'use strict';

    if (!Common.enumLock)
        Common.enumLock = {};

    var enumLock = {
        undoLock:       'can-undo',
        redoLock:       'can-redo',
        copyLock:       'can-copy',
        inLightTheme:   'light-theme',
        noParagraphSelected:  'no-paragraph',
        cantPrint:      'cant-print',
        lostConnect:    'disconnect',
        disableOnStart: 'on-start'
    };
    for (var key in enumLock) {
        if (enumLock.hasOwnProperty(key)) {
            Common.enumLock[key] = enumLock[key];
        }
    }

    PDFE.Views.Toolbar =  Common.UI.Mixtbar.extend(_.extend((function(){

        return {
            el: '#toolbar',

            // Compile our stats template
            // template: _.template(template),

            // Delegated events for creating new items, and clearing completed ones.
            events: {
                //
            },

            initialize: function () {
                var me = this;

                /**
                 * UI Components
                 */

                this.SchemeNames = [ this.txtScheme22,
                    this.txtScheme1, this.txtScheme2, this.txtScheme3, this.txtScheme4, this.txtScheme5,
                    this.txtScheme6, this.txtScheme7, this.txtScheme8, this.txtScheme9, this.txtScheme10,
                    this.txtScheme11, this.txtScheme12, this.txtScheme13, this.txtScheme14, this.txtScheme15,
                    this.txtScheme16, this.txtScheme17, this.txtScheme18, this.txtScheme19, this.txtScheme20,
                    this.txtScheme21
                ];

                this.paragraphControls = [];
                this.toolbarControls = [];
                this._state = {
                    hasCollaborativeChanges: undefined
                };

                Common.NotificationCenter.on('app:ready', me.onAppReady.bind(this));
                return this;
            },

            applyLayout: function (config) {
                var me = this;
                me.lockControls = [];
                var _set = Common.enumLock;
                if ( config.isEdit ) {
                    Common.UI.Mixtbar.prototype.initialize.call(this, {
                            template: _.template(template),
                            tabs: [
                                {caption: me.textTabFile, action: 'file', extcls: 'canedit', layoutname: 'toolbar-file', haspanel:false, dataHintTitle: 'F'},
                                {caption: me.textTabHome, action: 'home', extcls: 'canedit', dataHintTitle: 'H'}
                            ]
                        }
                    );

                    this.btnSaveCls = 'btn-save';
                    this.btnSaveTip = this.tipSave + Common.Utils.String.platformKey('Ctrl+S');

                    this.btnPrint = new Common.UI.Button({
                        id: 'id-toolbar-btn-print',
                        cls: 'btn-toolbar',
                        iconCls: 'toolbar__icon btn-print no-mask',
                        lock: [_set.cantPrint, _set.disableOnStart],
                        signals: ['disabled'],
                        split: config.canQuickPrint,
                        menu: config.canQuickPrint,
                        dataHint: '1',
                        dataHintDirection: 'bottom',
                        dataHintTitle: 'P',
                        printType: 'print'
                    });
                    this.toolbarControls.push(this.btnPrint);

                    this.btnSave = new Common.UI.Button({
                        id: 'id-toolbar-btn-save',
                        cls: 'btn-toolbar',
                        iconCls: 'toolbar__icon no-mask ' + this.btnSaveCls,
                        lock: [_set.lostConnect, _set.disableOnStart],
                        signals: ['disabled'],
                        dataHint: '1',
                        dataHintDirection: 'top',
                        dataHintTitle: 'S'
                    });
                    this.toolbarControls.push(this.btnSave);
                    this.btnCollabChanges = this.btnSave;

                    this.btnUndo = new Common.UI.Button({
                        id: 'id-toolbar-btn-undo',
                        cls: 'btn-toolbar',
                        iconCls: 'toolbar__icon btn-undo',
                        lock: [_set.undoLock, _set.previewReviewMode, _set.lostConnect, _set.disableOnStart, _set.docLockView],
                        signals: ['disabled'],
                        dataHint: '1',
                        dataHintDirection: 'bottom',
                        dataHintTitle: 'Z'
                    });
                    this.toolbarControls.push(this.btnUndo);

                    this.btnRedo = new Common.UI.Button({
                        id: 'id-toolbar-btn-redo',
                        cls: 'btn-toolbar',
                        iconCls: 'toolbar__icon btn-redo',
                        lock: [_set.redoLock, _set.previewReviewMode, _set.lostConnect, _set.disableOnStart, _set.docLockView],
                        signals: ['disabled'],
                        dataHint: '1',
                        dataHintDirection: 'bottom',
                        dataHintTitle: 'Y'
                    });
                    this.toolbarControls.push(this.btnRedo);

                    this.btnCopy = new Common.UI.Button({
                        id: 'id-toolbar-btn-copy',
                        cls: 'btn-toolbar',
                        iconCls: 'toolbar__icon btn-copy',
                        lock: [_set.copyLock, _set.previewReviewMode, _set.viewFormMode, _set.lostConnect, _set.disableOnStart],
                        dataHint: '1',
                        dataHintDirection: 'top',
                        dataHintTitle: 'C'
                    });
                    this.toolbarControls.push(this.btnCopy);

                    this.btnPaste = new Common.UI.Button({
                        id: 'id-toolbar-btn-paste',
                        cls: 'btn-toolbar',
                        iconCls: 'toolbar__icon btn-paste',
                        lock: [_set.paragraphLock, _set.headerLock, _set.richEditLock, _set.plainEditLock, _set.previewReviewMode, _set.viewFormMode, _set.lostConnect, _set.disableOnStart, _set.docLockView, _set.docLockComments],
                        dataHint: '1',
                        dataHintDirection: 'top',
                        dataHintTitle: 'V'
                    });
                    this.paragraphControls.push(this.btnPaste);

                    this.btnCut = new Common.UI.Button({
                        id: 'id-toolbar-btn-cut',
                        cls: 'btn-toolbar',
                        iconCls: 'toolbar__icon btn-cut',
                        lock: [_set.copyLock, _set.paragraphLock, _set.headerLock, _set.richEditLock, _set.plainEditLock, _set.imageLock, _set.previewReviewMode, _set.viewFormMode, _set.lostConnect, _set.disableOnStart, _set.docLockView, _set.docLockComments],
                        dataHint: '1',
                        dataHintDirection: 'top',
                        dataHintTitle: 'X'
                    });
                    this.paragraphControls.push(this.btnCut);

                    this.btnSelectAll = new Common.UI.Button({
                        id: 'id-toolbar-btn-select-all',
                        cls: 'btn-toolbar',
                        iconCls: 'toolbar__icon btn-select-all',
                        lock: [_set.viewFormMode, _set.disableOnStart],
                        dataHint: '1',
                        dataHintDirection: 'bottom'
                    });
                    this.toolbarControls.push(this.btnSelectAll);

                    this.btnSelectTool = new Common.UI.Button({
                        id: 'tlbtn-selecttool',
                        cls: 'btn-toolbar x-huge icon-top',
                        iconCls: 'toolbar__icon btn-select',
                        lock: [_set.disableOnStart],
                        caption: me.capBtnSelect,
                        toggleGroup: 'select-tools-tb',
                        enableToggle: true,
                        allowDepress: false,
                        dataHint: '1',
                        dataHintDirection: 'bottom',
                        dataHintOffset: 'small'
                    });
                    this.toolbarControls.push(this.btnSelectTool);

                    this.btnHandTool = new Common.UI.Button({
                        id: 'tlbtn-handtool',
                        cls: 'btn-toolbar x-huge icon-top',
                        iconCls: 'toolbar__icon btn-hand-tool',
                        lock: [_set.disableOnStart],
                        caption: me.capBtnHand,
                        toggleGroup: 'select-tools-tb',
                        enableToggle: true,
                        allowDepress: false,
                        dataHint: '1',
                        dataHintDirection: 'bottom',
                        dataHintOffset: 'small'
                    });
                    this.toolbarControls.push(this.btnHandTool);

                    this.btnAddComment = new Common.UI.Button({
                        id: 'tlbtn-addcomment',
                        cls: 'btn-toolbar x-huge icon-top',
                        iconCls: 'toolbar__icon btn-big-menu-comments',
                        lock: [_set.disableOnStart],
                        caption: this.capBtnComment,
                        dataHint: '1',
                        dataHintDirection: 'bottom',
                        dataHintOffset: 'small'
                    });
                    this.toolbarControls.push(this.btnAddComment);

                    //
                    // Menus
                    //

                    // Disable all components before load document
                    this.lockControls = me.toolbarControls.concat(me.paragraphControls);
                    this.lockToolbar(Common.enumLock.disableOnStart, true, {array: this.lockControls});

                    this.on('render:after', _.bind(this.onToolbarAfterRender, this));
                }
                return this;
            },

            render: function (mode) {
                var me = this;

                /**
                 * Render UI layout
                 */

                this.fireEvent('render:before', [this]);

                me.isCompactView = mode.isCompactView;
                if ( mode.isEdit ) {
                    me.$el.html(me.rendererComponents(me.$layout));
                }

                this.fireEvent('render:after', [this]);
                Common.UI.Mixtbar.prototype.afterRender.call(this);

                Common.NotificationCenter.on({
                    'window:resize': function() {
                        Common.UI.Mixtbar.prototype.onResize.apply(me, arguments);
                    }
                });

                if ( mode.isEdit ) {
                    /** coauthoring begin **/
                    this.showSynchTip = !Common.localStorage.getBool("de-hide-synch");
                    this.needShowSynchTip = false;
                    /** coauthoring end **/

                    me.setTab('home');
                }

                if ( me.isCompactView )
                    me.setFolded(true);

                return this;
            },

            onTabClick: function (e) {
                var me = this,
                    tab = $(e.currentTarget).find('> a[data-tab]').data('tab'),
                    is_file_active = me.isTabActive('file');

                Common.UI.Mixtbar.prototype.onTabClick.apply(me, arguments);

                if ( is_file_active ) {
                    me.fireEvent('file:close');
                } else
                if ( tab == 'file' ) {
                    me.fireEvent('file:open');
                    me.setTab(tab);
                }

                if ( me.isTabActive('home'))
                    me.fireEvent('home:open');
            },

            rendererComponents: function (html) {
                var $host = $(html);
                var _injectComponent = function (id, cmp) {
                    Common.Utils.injectComponent($host.findById(id), cmp);
                };

                _injectComponent('#slot-btn-print', this.btnPrint);
                _injectComponent('#slot-btn-save', this.btnSave);
                _injectComponent('#slot-btn-undo', this.btnUndo);
                _injectComponent('#slot-btn-redo', this.btnRedo);
                _injectComponent('#slot-btn-copy', this.btnCopy);
                _injectComponent('#slot-btn-paste', this.btnPaste);
                _injectComponent('#slot-btn-cut', this.btnCut);
                _injectComponent('#slot-btn-select-all', this.btnSelectAll);
                _injectComponent('#slot-btn-select-tool', this.btnSelectTool);
                _injectComponent('#slot-btn-hand-tool', this.btnHandTool);
                _injectComponent('#slot-btn-comment', this.btnAddComment);

                this.btnPrint.menu && this.btnPrint.$el.addClass('split');
                return $host;
            },

            onAppReady: function (config) {
                var me = this;
                (new Promise( function(resolve, reject) {
                    resolve();
                })).then(function () {
                    if ( !config.isEdit ) return;

                    if(me.btnPrint.menu){
                        me.btnPrint.setMenu(
                            new Common.UI.Menu({
                                items:[
                                    {
                                        caption:            me.tipPrint,
                                        iconCls:            'menu__icon btn-print',
                                        toggleGroup:        'viewPrint',
                                        value:              'print',
                                        iconClsForMainBtn:  'btn-print',
                                        platformKey:         Common.Utils.String.platformKey('Ctrl+P')
                                    },
                                    {
                                        caption:            me.tipPrintQuick,
                                        iconCls:            'menu__icon btn-quick-print',
                                        toggleGroup:        'viewPrint',
                                        value:              'print-quick',
                                        iconClsForMainBtn:  'btn-quick-print',
                                        platformKey:        ''
                                    }
                                ]
                            }));
                    }
                });
            },

            createDelayedElements: function () {
                if (this.api) {
                    this.updateMetricUnit();
                }

                // set hints
                this.btnPrint.updateHint(this.tipPrint + Common.Utils.String.platformKey('Ctrl+P'));
                this.btnSave.updateHint(this.btnSaveTip);
                this.btnUndo.updateHint(this.tipUndo + Common.Utils.String.platformKey('Ctrl+Z'));
                this.btnRedo.updateHint(this.tipRedo + Common.Utils.String.platformKey('Ctrl+Y'));
                this.btnCopy.updateHint(this.tipCopy + Common.Utils.String.platformKey('Ctrl+C'));
                this.btnPaste.updateHint(this.tipPaste + Common.Utils.String.platformKey('Ctrl+V'));
                this.btnCut.updateHint(this.tipCut + Common.Utils.String.platformKey('Ctrl+X'));
                this.btnSelectAll.updateHint(this.tipSelectAll + Common.Utils.String.platformKey('Ctrl+A'));
                this.btnSelectTool.updateHint(this.tipSelectTool);
                this.btnHandTool.updateHint(this.tipHandTool);
                this.btnAddComment.updateHint(this.tipAddComment);
            },

            onToolbarAfterRender: function(toolbar) {
                // DataView and pickers
            },

            updateMetricUnit: function () {
            },

            setApi: function (api) {
                this.api = api;
                /** coauthoring begin **/
                this.api.asc_registerCallback('asc_onSendThemeColorSchemes', _.bind(this.onSendThemeColorSchemes, this));
                this.api.asc_registerCallback('asc_onCollaborativeChanges', _.bind(this.onCollaborativeChanges, this));
                this.api.asc_registerCallback('asc_onAuthParticipantsChanged', _.bind(this.onApiUsersChanged, this));
                this.api.asc_registerCallback('asc_onParticipantsChanged', _.bind(this.onApiUsersChanged, this));
                /** coauthoring end **/
                return this;
            },

            setMode: function (mode) {
                if (mode.isDisconnected) {
                    this.lockToolbar(Common.enumLock.lostConnect, true);
                    if ( this.synchTooltip )
                        this.synchTooltip.hide();
                    if (!mode.enableDownload)
                        this.lockToolbar(Common.enumLock.cantPrint, true, {array: [this.btnPrint]});
                } else {
                    this.lockToolbar(Common.enumLock.cantPrint, !mode.canPrint, {array: [this.btnPrint]});
                    !mode.canPrint && this.btnPrint.hide();
                }

                this.mode = mode;
            },

            onSendThemeColorSchemes: function (schemas) {
            },

            /** coauthoring begin **/
            onCollaborativeChanges: function () {
                if (this._state.hasCollaborativeChanges) return;
                if (!this.btnCollabChanges.rendered || this._state.previewmode) {
                    this.needShowSynchTip = true;
                    return;
                }

                this._state.hasCollaborativeChanges = true;
                this.btnCollabChanges.cmpEl.addClass('notify');
                if (this.showSynchTip) {
                    this.btnCollabChanges.updateHint('');
                    if (this.synchTooltip === undefined)
                        this.createSynchTip();

                    this.synchTooltip.show();
                } else {
                    this.btnCollabChanges.updateHint(this.tipSynchronize + Common.Utils.String.platformKey('Ctrl+S'));
                }

                this.btnSave.setDisabled(!this.mode.isPDFEdit && !this.mode.isPDFAnnotate);
                Common.Gateway.collaborativeChanges();
            },

            createSynchTip: function () {
                this.synchTooltip = new Common.UI.SynchronizeTip({
                    extCls: (this.mode.customization && !!this.mode.customization.compactHeader) ? undefined : 'inc-index',
                    placement: 'right-bottom',
                    target: this.btnCollabChanges.$el
                });
                this.synchTooltip.on('dontshowclick', function () {
                    this.showSynchTip = false;
                    this.synchTooltip.hide();
                    this.btnCollabChanges.updateHint(this.tipSynchronize + Common.Utils.String.platformKey('Ctrl+S'));
                    Common.localStorage.setItem("de-hide-synch", 1);
                }, this);
                this.synchTooltip.on('closeclick', function () {
                    this.synchTooltip.hide();
                    this.btnCollabChanges.updateHint(this.tipSynchronize + Common.Utils.String.platformKey('Ctrl+S'));
                }, this);
            },

            synchronizeChanges: function () {
                if ( !this._state.previewmode && this.btnCollabChanges.rendered ) {
                    var me = this;

                    if ( me.btnCollabChanges.cmpEl.hasClass('notify') ) {
                        me.btnCollabChanges.cmpEl.removeClass('notify');
                        if (this.synchTooltip)
                            this.synchTooltip.hide();
                        this.btnCollabChanges.updateHint(this.btnSaveTip);

                        this.btnSave.setDisabled(!me.mode.forcesave || !me.mode.isPDFEdit && !me.mode.isPDFAnnotate);
                        this._state.hasCollaborativeChanges = false;
                    }
                }
            },

            onApiUsersChanged: function (users) {
                var editusers = [];
                _.each(users, function (item) {
                    if (!item.asc_getView())
                        editusers.push(item);
                });

                var me = this;
                var length = _.size(editusers);
                var cls = (length > 1) ? 'btn-save-coauth' : 'btn-save';
                if ( cls !== me.btnSaveCls && me.btnCollabChanges.rendered ) {
                    me.btnSaveTip = ((length > 1) ? me.tipSaveCoauth : me.tipSave ) + Common.Utils.String.platformKey('Ctrl+S');
                    me.btnCollabChanges.updateHint(me.btnSaveTip);
                    me.btnCollabChanges.$icon.removeClass(me.btnSaveCls).addClass(cls);
                    me.btnSaveCls = cls;
                }
            },

            /** coauthoring end **/

            lockToolbar: function (causes, lock, opts) {
                Common.Utils.lockControls(causes, lock, opts, this.lockControls);
            },

            tipCopy: 'Copy',
            tipPaste: 'Paste',
            tipUndo: 'Undo',
            tipRedo: 'Redo',
            tipPrint: 'Print',
            tipPrintQuick: 'Quick print',
            tipSave: 'Save',
            tipSelectTool: 'Select tool',
            tipHandTool: 'Hand tool',
            tipSynchronize: 'The document has been changed by another user. Please click to save your changes and reload the updates.',
            txtScheme1: 'Office',
            txtScheme2: 'Grayscale',
            txtScheme3: 'Apex',
            txtScheme4: 'Aspect',
            txtScheme5: 'Civic',
            txtScheme6: 'Concourse',
            txtScheme7: 'Equity',
            txtScheme8: 'Flow',
            txtScheme9: 'Foundry',
            txtScheme10: 'Median',
            txtScheme11: 'Metro',
            txtScheme12: 'Module',
            txtScheme13: 'Opulent',
            txtScheme14: 'Oriel',
            txtScheme15: 'Origin',
            txtScheme16: 'Paper',
            txtScheme17: 'Solstice',
            txtScheme18: 'Technic',
            txtScheme19: 'Trek',
            txtScheme20: 'Urban',
            txtScheme21: 'Verve',
            tipSaveCoauth: 'Save your changes for the other users to see them.',
            textTabFile: 'File',
            textTabHome: 'Home',
            capBtnSelect: 'Select',
            capBtnHand: 'Hand',
            textTabView: 'View',
            tipSelectAll: 'Select all',
            tipCut: 'Cut',
            textTabDraw: 'Draw',
            capBtnComment: 'Comment',
            tipAddComment: 'Add comment'
        }
    })(), PDFE.Views.Toolbar || {}));
});
