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
 *  Toolbar Controller
 *
 *  Created by Alexander Yuzhin on 1/15/14
 *  Copyright (c) 2018 Ascensio System SIA. All rights reserved.
 *
 */

define([
    'core',
    'common/main/lib/component/Window',
    'common/main/lib/view/CopyWarningDialog',
    'common/main/lib/util/define',
    'pdfeditor/main/app/view/Toolbar'
], function () {
    'use strict';

    PDFE.Controllers.Toolbar = Backbone.Controller.extend(_.extend({
        models: [],
        collections: [],
        controllers: [],
        views: [
            'Toolbar'
        ],

        initialize: function() {
            this._state = {
                activated: false,
                prcontrolsdisable:undefined,
                can_undo: undefined,
                can_redo: undefined,
                lock_doc: undefined,
                can_copycut: undefined
            };
            this.editMode = true;
            this.binding = {};

            this.addListeners({
                'Toolbar': {
                    'change:compact'    : this.onClickChangeCompact,
                    'home:open'         : this.onHomeOpen
                },
                'FileMenu': {
                    'menu:hide': this.onFileMenu.bind(this, 'hide'),
                    'menu:show': this.onFileMenu.bind(this, 'show')
                },
                'Common.Views.Header': {
                    'print': function (opts) {
                        var _main = this.getApplication().getController('Main');
                        _main.onPrint();
                    },
                    'print-quick': function (opts) {
                        var _main = this.getApplication().getController('Main');
                        _main.onPrintQuick();
                    },
                    'save': function (opts) {
                        this.api.asc_Save();
                    },
                    'undo': this.onUndo,
                    'redo': this.onRedo,
                    'downloadas': function (opts) {
                        var _main = this.getApplication().getController('Main');
                        var _file_type = _main.document.fileType,
                            _format;
                        if ( !!_file_type ) {
                            if ( /^pdf|xps|oxps|djvu/i.test(_file_type) ) {
                                _main.api.asc_DownloadOrigin();
                                return;
                            } else {
                                _format = Asc.c_oAscFileType[ _file_type.toUpperCase() ];
                            }
                        }

                        var _supported = [
                            Asc.c_oAscFileType.TXT,
                            Asc.c_oAscFileType.RTF,
                            Asc.c_oAscFileType.ODT,
                            Asc.c_oAscFileType.DOCX,
                            Asc.c_oAscFileType.HTML,
                            Asc.c_oAscFileType.PDFA,
                            Asc.c_oAscFileType.DOTX,
                            Asc.c_oAscFileType.OTT,
                            Asc.c_oAscFileType.FB2,
                            Asc.c_oAscFileType.EPUB,
                            Asc.c_oAscFileType.DOCM
                        ];
                        if ( !_format || _supported.indexOf(_format) < 0 )
                            _format = Asc.c_oAscFileType.PDF;

                        _main.api.asc_DownloadAs(new Asc.asc_CDownloadOptions(_format));
                    },
                    'go:editor': function() {
                        Common.Gateway.requestEditRights();
                    }
                },
                'ViewTab': {
                    'toolbar:setcompact': this.onChangeCompactView.bind(this)
                }
            });

            var me = this;

            Common.NotificationCenter.on('toolbar:collapse', _.bind(function () {
                this.toolbar.collapse();
            }, this));
        },

        onLaunch: function() {
            // Create toolbar view
            this.toolbar = this.createView('Toolbar');
            this.toolbar.on('render:before', function (cmp) {
            });

            Common.NotificationCenter.on('app:ready', this.onAppReady.bind(this));
            Common.NotificationCenter.on('app:face', this.onAppShowed.bind(this));
        },

        setMode: function(mode) {
            this.mode = mode;
            this.toolbar.applyLayout(mode);
        },

        attachUIEvents: function(toolbar) {
            /**
             * UI Events
             */

            toolbar.btnPrint.on('click',                                _.bind(this.onPrint, this));
            toolbar.btnPrint.on('disabled',                             _.bind(this.onBtnChangeState, this, 'print:disabled'));
            toolbar.btnSave.on('click',                                 _.bind(this.onSave, this));
            toolbar.btnUndo.on('click',                                 _.bind(this.onUndo, this));
            toolbar.btnUndo.on('disabled',                              _.bind(this.onBtnChangeState, this, 'undo:disabled'));
            toolbar.btnRedo.on('click',                                 _.bind(this.onRedo, this));
            toolbar.btnRedo.on('disabled',                              _.bind(this.onBtnChangeState, this, 'redo:disabled'));
            toolbar.btnCopy.on('click',                                 _.bind(this.onCopyPaste, this, 'copy'));
            toolbar.btnPaste.on('click',                                _.bind(this.onCopyPaste, this, 'paste'));
            toolbar.btnCut.on('click',                                  _.bind(this.onCopyPaste, this, 'cut'));
            toolbar.btnSelectAll.on('click',                            _.bind(this.onSelectAll, this));
            toolbar.btnSelectTool.on('click',                           _.bind(this.onSelectTool, this, 'select'));
            toolbar.btnHandTool.on('click',                             _.bind(this.onSelectTool, this, 'hand'));
            toolbar.btnAddComment.on('click', function (btn, e) {
                Common.NotificationCenter.trigger('app:comment:add', 'toolbar');
            });

            this.onBtnChangeState('undo:disabled', toolbar.btnUndo, toolbar.btnUndo.isDisabled());
            this.onBtnChangeState('redo:disabled', toolbar.btnRedo, toolbar.btnRedo.isDisabled());
        },

        setApi: function(api) {
            this.api = api;

            if (this.mode.isEdit) {
                this.toolbar.setApi(api);

                this.api.asc_registerCallback('asc_onCanUndo', _.bind(this.onApiCanRevert, this, 'undo'));
                this.api.asc_registerCallback('asc_onCanRedo', _.bind(this.onApiCanRevert, this, 'redo'));
                this.api.asc_registerCallback('asc_onFocusObject', _.bind(this.onApiFocusObject, this));
                this.api.asc_registerCallback('asc_onZoomChange', _.bind(this.onApiZoomChange, this));
                this.api.asc_registerCallback('asc_onCoAuthoringDisconnect', _.bind(this.onApiCoAuthoringDisconnect, this));
                Common.NotificationCenter.on('api:disconnect', _.bind(this.onApiCoAuthoringDisconnect, this));
                this.api.asc_registerCallback('asc_onCanCopyCut', _.bind(this.onApiCanCopyCut, this));
                this.api.asc_registerCallback('asc_onContextMenu', _.bind(this.onContextMenu, this));
                Common.NotificationCenter.on('pdf:mode', _.bind(function () {
                    this.toolbar.setVisible('draw', this.mode.isPDFEdit && Common.UI.LayoutManager.isElementVisible('toolbar-draw'));
                }, this));
            }
        },

        onChangeCompactView: function(view, compact) {
            this.toolbar.setFolded(compact);
            this.toolbar.fireEvent('view:compact', [this, compact]);

            Common.localStorage.setBool('pdfe-compact-toolbar', compact);
            Common.NotificationCenter.trigger('layout:changed', 'toolbar');
            Common.NotificationCenter.trigger('edit:complete', this.toolbar);
        },

        onClickChangeCompact: function (from) {
            if ( from != 'file' ) {
                var me = this;
                setTimeout(function () {
                    me.onChangeCompactView(null, !me.toolbar.isCompact());
                }, 0);
            }
        },

        onContextMenu: function() {
            this.toolbar.collapse();
        },

        onApiCanRevert: function(which, can) {
            if (which=='undo') {
                if (this._state.can_undo !== can) {
                    this.toolbar.lockToolbar(Common.enumLock.undoLock, !can, {array: [this.toolbar.btnUndo]});
                    this._state.can_undo = can;
                }
            } else {
                if (this._state.can_redo !== can) {
                    this.toolbar.lockToolbar(Common.enumLock.redoLock, !can, {array: [this.toolbar.btnRedo]});
                    this._state.can_redo = can;
                }
            }
        },

        onApiCanCopyCut: function(can) {
            if (this._state.can_copycut !== can) {
                this.toolbar.lockToolbar(Common.enumLock.copyLock, !can, {array: [this.toolbar.btnCopy, this.toolbar.btnCut]});
                this._state.can_copycut = can;
            }
        },

        onApiFocusObject: function(selectedObjects) {
            if (!this.editMode) return;

            var pr, sh, i = -1, type,
                paragraph_locked = false,
                image_locked = false,
                shape_pr = undefined,
                toolbar = this.toolbar,
                in_image = false,
                in_para = false;

            while (++i < selectedObjects.length) {
                type = selectedObjects[i].get_ObjectType();
                pr   = selectedObjects[i].get_ObjectValue();

                if (type === Asc.c_oAscTypeSelectElement.Paragraph) {
                    paragraph_locked = pr.get_Locked();
                    sh = pr.get_Shade();
                    in_para = true;
                } else if (type === Asc.c_oAscTypeSelectElement.Image) {
                    in_image = true;
                    image_locked = pr.get_Locked();
                    if (pr && pr.get_ShapeProperties())
                        shape_pr = pr.get_ShapeProperties();
                }
            }

            this.toolbar.lockToolbar(Common.enumLock.paragraphLock, paragraph_locked,   {array: this.toolbar.paragraphControls});
        },

        onApiZoomChange: function(percent, type) {},

        onNewDocument: function(btn, e) {
            if (this.api)
                this.api.OpenNewDocument();

            Common.NotificationCenter.trigger('edit:complete', this.toolbar);
            Common.component.Analytics.trackEvent('ToolBar', 'New Document');
        },

        onOpenDocument: function(btn, e) {
            if (this.api)
                this.api.LoadDocumentFromDisk();

            Common.NotificationCenter.trigger('edit:complete', this.toolbar);
            Common.component.Analytics.trackEvent('ToolBar', 'Open Document');
        },

        onPrint: function(e) {
            if (this.toolbar.btnPrint.options.printType == 'print') {
                Common.NotificationCenter.trigger('file:print', this.toolbar);
                Common.NotificationCenter.trigger('edit:complete', this.toolbar);
            } else {
                var _main = this.getApplication().getController('Main');
                _main.onPrintQuick();
            }
            Common.component.Analytics.trackEvent('Print');
            Common.component.Analytics.trackEvent('ToolBar', 'Print');

        },

        onPrintMenu: function (btn, e){
            var oldType = this.toolbar.btnPrint.options.printType;
            var newType = e.value;

            if(newType != oldType) {
                this.toolbar.btnPrint.changeIcon({
                    next: e.options.iconClsForMainBtn,
                    curr: this.toolbar.btnPrint.menu.items.filter(function(item){return item.value == oldType;})[0].options.iconClsForMainBtn
                });
                this.toolbar.btnPrint.updateHint([e.caption + e.options.platformKey]);
                this.toolbar.btnPrint.options.printType = newType;
            }
            this.onPrint(e);
        },

        onSave: function(e) {
            var toolbar = this.toolbar;
            if (this.api) {
                var isModified = this.api.asc_isDocumentCanSave();
                var isSyncButton = toolbar.btnCollabChanges && toolbar.btnCollabChanges.cmpEl.hasClass('notify');
                if (!isModified && !isSyncButton && !toolbar.mode.forcesave)
                    return;

                this.api.asc_Save();
            }

            toolbar.btnSave.setDisabled(!toolbar.mode.forcesave);

            Common.NotificationCenter.trigger('edit:complete', toolbar);

            Common.component.Analytics.trackEvent('Save');
            Common.component.Analytics.trackEvent('ToolBar', 'Save');
        },

        onBtnChangeState: function(prop) {
            if ( /\:disabled$/.test(prop) ) {
                var _is_disabled = arguments[2];
                this.toolbar.fireEvent(prop, [_is_disabled]);
            }
        },

        onUndo: function(btn, e) {
            if (this.api)
                this.api.Undo();

            Common.NotificationCenter.trigger('edit:complete', this.toolbar);

            Common.component.Analytics.trackEvent('ToolBar', 'Undo');
        },

        onRedo: function(btn, e) {
            if (this.api)
                this.api.Redo();

            Common.NotificationCenter.trigger('edit:complete', this.toolbar);

            Common.component.Analytics.trackEvent('ToolBar', 'Redo');
        },

        onCopyPaste: function(type, e) {
            var me = this;
            if (me.api) {
                var res = (type === 'cut') ? me.api.Cut() : ((type === 'copy') ? me.api.Copy() : me.api.Paste());
                if (!res) {
                    if (!Common.localStorage.getBool("pdfe-hide-copywarning")) {
                        (new Common.Views.CopyWarningDialog({
                            handler: function(dontshow) {
                                if (dontshow) Common.localStorage.setItem("pdfe-hide-copywarning", 1);
                                Common.NotificationCenter.trigger('edit:complete', me.toolbar);
                            }
                        })).show();
                    }
                } else
                    Common.component.Analytics.trackEvent('ToolBar', 'Copy Warning');
            }
            Common.NotificationCenter.trigger('edit:complete', me.toolbar);
        },

        onSelectAll: function(e) {
            if (this.api)
                this.api.asc_EditSelectAll();

            Common.NotificationCenter.trigger('edit:complete', this.toolbar);
            Common.component.Analytics.trackEvent('ToolBar', 'Select All');
        },

        onSelectTool: function (type, btn, e) {
            if (this.api)
                this.api.asc_setViewerTargetType(type);
            this.mode.isEdit && this.api.asc_StopInkDrawer();
            Common.NotificationCenter.trigger('edit:complete', this.toolbar);
        },

        activateControls: function() {
            this.toolbar.lockToolbar(Common.enumLock.disableOnStart, false);
            this.toolbar.lockToolbar(Common.enumLock.undoLock, this._state.can_undo!==true, {array: [this.toolbar.btnUndo]});
            this.toolbar.lockToolbar(Common.enumLock.redoLock, this._state.can_redo!==true, {array: [this.toolbar.btnRedo]});
            this.toolbar.lockToolbar(Common.enumLock.copyLock, this._state.can_copycut!==true, {array: [this.toolbar.btnCopy, this.toolbar.btnCut]});
            this.toolbar.btnSave.setDisabled(!this.mode.isPDFEdit && !this.mode.isPDFAnnotate);
            this._state.activated = true;
        },

        onHomeOpen: function() {
        },

        onHideMenus: function(e){
            Common.NotificationCenter.trigger('edit:complete', this.toolbar);
        },

        onApiCoAuthoringDisconnect: function(enableDownload) {
            this.mode.isEdit && this.toolbar.setMode({isDisconnected:true, enableDownload: !!enableDownload});
            this.editMode = false;
            this.DisableToolbar(true, true);
        },

        DisableToolbar: function(disable, viewMode) {
            if (viewMode!==undefined) this.editMode = !viewMode;
            disable = disable || !this.editMode;

            var mask = $('.toolbar-mask');
            if (disable && mask.length>0 || !disable && mask.length==0) return;

            var toolbar = this.toolbar;
            toolbar.hideMoreBtns();

            if(disable) {
                mask = $("<div class='toolbar-mask'>").appendTo(toolbar.$el.find('.toolbar'));
            } else {
                mask.remove();
            }
            toolbar.$el.find('.toolbar').toggleClass('masked', $('.toolbar-mask').length>0);
            if ( toolbar.synchTooltip )
                toolbar.synchTooltip.hide();

            var hkComments = Common.Utils.isMac ? 'command+alt+a' : 'alt+h';
            disable ? Common.util.Shortcuts.suspendEvents(hkComments) : Common.util.Shortcuts.resumeEvents(hkComments);
        },

        createDelayedElements: function() {
            this.toolbar.createDelayedElements();
            this.attachUIEvents(this.toolbar);
            Common.Utils.injectSvgIcons();
        },

        onAppShowed: function (config) {
            var me = this;

            var compactview = !config.isEdit;
            if ( config.isEdit) {
                if ( Common.localStorage.itemExists("pdfe-compact-toolbar") ) {
                    compactview = Common.localStorage.getBool("pdfe-compact-toolbar");
                } else
                if ( config.customization && config.customization.compactToolbar )
                    compactview = true;
            }

            me.toolbar.render(_.extend({isCompactView: compactview}, config));

            if ( config.isEdit ) {
                me.toolbar.setMode(config);

                me.toolbar.btnSave.on('disabled', _.bind(me.onBtnChangeState, me, 'save:disabled'));

                if (!(config.customization && config.customization.compactHeader)) {
                    // hide 'print' and 'save' buttons group and next separator
                    me.toolbar.btnPrint.$el.parents('.group').hide().next().hide();

                    // hide 'undo' and 'redo' buttons and retrieve parent container
                    var $box = me.toolbar.btnUndo.$el.hide().next().hide().parent();

                    // move 'paste' button to the container instead of 'undo' and 'redo'
                    me.toolbar.btnPaste.$el.detach().appendTo($box);
                    me.toolbar.btnPaste.$el.find('button').attr('data-hint-direction', 'bottom');
                    me.toolbar.btnCopy.$el.removeClass('split');
                    me.toolbar.processPanelVisible(null, true, true);
                }
            }
            if ( config.canPDFEdit ) {
                var drawtab = me.getApplication().getController('Common.Controllers.Draw');
                drawtab.setApi(me.api).setMode(config);
                $panel = drawtab.createToolbarPanel();
                if ($panel) {
                    tab = {action: 'draw', caption: me.toolbar.textTabDraw, extcls: 'canedit', layoutname: 'toolbar-draw', dataHintTitle: 'C'};
                    me.toolbar.addTab(tab, $panel, 2);
                    Array.prototype.push.apply(me.toolbar.lockControls, drawtab.getView().getButtons());
                    Array.prototype.push.apply(me.toolbar.paragraphControls, drawtab.getView().getButtons());
                }
            }

            var tab = {caption: me.toolbar.textTabView, action: 'view', extcls: config.isEdit ? 'canedit' : '', layoutname: 'toolbar-view', dataHintTitle: 'W'};
            var viewtab = me.getApplication().getController('ViewTab');
            viewtab.setApi(me.api).setConfig({toolbar: me, mode: config});
            var $panel = viewtab.createToolbarPanel();
            if ($panel) {
                me.toolbar.addTab(tab, $panel, 8);
                me.toolbar.setVisible('view', Common.UI.LayoutManager.isElementVisible('toolbar-view'));
            }
        },

        onAppReady: function (config) {
            var me = this;
            me.appOptions = config;

            this.btnsComment = [];
            // if ( config.canCoAuthoring && config.canComments ) {
            //     this.btnsComment = Common.Utils.injectButtons(this.toolbar.$el.find('.slot-comment'), 'tlbtn-addcomment-', 'toolbar__icon btn-menu-comments', this.toolbar.capBtnComment,
            //                 [  Common.enumLock.paragraphLock, Common.enumLock.headerLock, Common.enumLock.richEditLock, Common.enumLock.plainEditLock, Common.enumLock.richDelLock, Common.enumLock.plainDelLock,
            //                         Common.enumLock.cantAddQuotedComment, Common.enumLock.imageLock, Common.enumLock.inSpecificForm, Common.enumLock.inImage, Common.enumLock.lostConnect, Common.enumLock.disableOnStart,
            //                         Common.enumLock.previewReviewMode, Common.enumLock.viewFormMode, Common.enumLock.docLockView, Common.enumLock.docLockForms ],
            //                      undefined, undefined, undefined, '1', 'bottom');
            //     if ( this.btnsComment.length ) {
            //         var _comments = PDFE.getController('Common.Controllers.Comments').getView();
            //         this.btnsComment.forEach(function (btn) {
            //             btn.updateHint( _comments.textHintAddComment );
            //             btn.on('click', function (btn, e) {
            //                 Common.NotificationCenter.trigger('app:comment:add', 'toolbar');
            //             });
            //         }, this);
            //     }
            //     Array.prototype.push.apply(this.toolbar.paragraphControls, this.btnsComment);
            //     Array.prototype.push.apply(this.toolbar.lockControls, this.btnsComment);
            // }

            (new Promise(function(accept) {
                accept();
            })).then(function () {
                me.toolbar && me.toolbar.btnHandTool.toggle(true, true);
                me.api && me.api.asc_setViewerTargetType('hand');
            });
        },

        getView: function (name) {
            return !name ? this.toolbar : Backbone.Controller.prototype.getView.apply(this, arguments);
        },

        onFileMenu: function (opts) {
            if ( opts == 'show' ) {
                if ( !this.toolbar.isTabActive('file') )
                    this.toolbar.setTab('file');
            } else {
                if ( this.toolbar.isTabActive('file') )
                    this.toolbar.setTab();
            }
        },

        textWarning: 'Warning',
        notcriticalErrorTitle: 'Warning'

    }, PDFE.Controllers.Toolbar || {}));
});
