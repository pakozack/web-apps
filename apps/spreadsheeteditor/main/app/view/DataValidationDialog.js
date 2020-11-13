/*
 *
 * (c) Copyright Ascensio System SIA 2010-2020
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
 * You can contact Ascensio System SIA at 20A-12 Ernesta Birznieka-Upisha
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
 *  DataValidationDialog.js
 *
 *  Created by Julia Radzhabova on 11.11.2020
 *  Copyright (c) 2020 Ascensio System SIA. All rights reserved.
 *
 */

define([    'text!spreadsheeteditor/main/app/template/DataValidationDialog.template',
    'common/main/lib/util/utils',
    'common/main/lib/component/InputField',
    'common/main/lib/component/ComboBox',
    'common/main/lib/component/CheckBox',
    'common/main/lib/component/TextareaField',
    'common/main/lib/view/AdvancedSettingsWindow'
], function (contentTemplate) { 'use strict';

    SSE.Views.DataValidationDialog = Common.Views.AdvancedSettingsWindow.extend(_.extend({
        options: {
            contentWidth: 320,
            height: 330,
            toggleGroup: 'data-validation-group',
            storageName: 'sse-data-validation-category'
        },

        initialize : function(options) {
            var me = this;

            _.extend(this.options, {
                title: this.options.title,
                items: [
                    {panelId: 'id-data-validation-settings',  panelCaption: this.strSettings},
                    {panelId: 'id-data-validation-input',     panelCaption: this.strInput},
                    {panelId: 'id-data-validation-error',     panelCaption: this.strError}
                ],
                contentTemplate:  _.template(contentTemplate)({
                    scope: this
                })
            }, options);

            this.api        = options.api;
            this.handler    = options.handler;
            this.props      = options.props;
            this._noApply = true;

            Common.Views.AdvancedSettingsWindow.prototype.initialize.call(this, this.options);
        },

        render: function() {
            Common.Views.AdvancedSettingsWindow.prototype.render.call(this);
            var me = this;
            var $window = this.getChild();

            // settings
            this.cmbAllow = new Common.UI.ComboBox({
                el: $window.find('#data-validation-cmb-allow'),
                cls: 'input-group-nr',
                editable: false,
                data:  [
                    {value: Asc.EDataValidationType.None, displayValue: this.txtAny},
                    {value: Asc.EDataValidationType.Whole, displayValue: this.txtWhole},
                    {value: Asc.EDataValidationType.Decimal, displayValue: this.txtDecimal},
                    {value: Asc.EDataValidationType.List, displayValue: this.txtList},
                    {value: Asc.EDataValidationType.Date, displayValue: this.txtDate},
                    {value: Asc.EDataValidationType.Time, displayValue: this.txtTime},
                    {value: Asc.EDataValidationType.TextLength, displayValue: this.txtTextLength},
                    {value: Asc.EDataValidationType.Custom, displayValue: this.txtOther}
                ],
                style: 'width: 100%;',
                menuStyle   : 'min-width: 100%;',
                takeFocusOnClose: true
            });
            this.cmbAllow.setValue(Asc.EDataValidationType.None);
            this.cmbAllow.on('selected', _.bind(this.onAllowSelect, this));

            this.cmbData = new Common.UI.ComboBox({
                el: $window.find('#data-validation-cmb-data'),
                cls: 'input-group-nr',
                editable: false,
                data: [
                    {value: Asc.EDataValidationOperator.Between, displayValue: this.txtBetween},
                    {value: Asc.EDataValidationOperator.NotBetween, displayValue: this.txtNotBetween},
                    {value: Asc.EDataValidationOperator.Equal, displayValue: this.txtEqual},
                    {value: Asc.EDataValidationOperator.NotEqual, displayValue: this.txtNotEqual},
                    {value: Asc.EDataValidationOperator.GreaterThan, displayValue: this.txtGreaterThan},
                    {value: Asc.EDataValidationOperator.LessThan, displayValue: this.txtLessThan},
                    {value: Asc.EDataValidationOperator.GreaterThanOrEqual, displayValue: this.txtGreaterThanOrEqual},
                    {value: Asc.EDataValidationOperator.LessThanOrEqual, displayValue: this.txtLessThanOrEqual}
                ],
                style: 'width: 100%;',
                menuStyle   : 'min-width: 100%;',
                takeFocusOnClose: true
            });
            this.cmbData.setValue(Asc.EDataValidationOperator.Between);
            this.cmbData.on('selected', _.bind(this.onDataSelect, this));

            this.chIgnore = new Common.UI.CheckBox({
                el: $window.find('#data-validation-ch-ignore'),
                labelText: this.textIgnore,
                value: true
            });
            this.chIgnore.on('change', _.bind(this.onIgnoreChange, this));

            this.lblRangeMin = $window.find('#data-validation-label-min');
            this.inputRangeMin = new Common.UI.InputFieldBtn({
                el: $window.find('#data-validation-txt-min'),
                style: '100%',
                textSelectData: 'Select data',
                // validateOnChange: true,
                validateOnBlur: false
            }).on('changed:after', _.bind(this.onRangeChange, this, 1)).on('button:click', _.bind(this.onSelectData, this, 1));

            this.lblRangeMax = $window.find('#data-validation-label-max');
            this.inputRangeMax = new Common.UI.InputFieldBtn({
                el: $window.find('#data-validation-txt-max'),
                style: '100%',
                textSelectData: 'Select data',
                // validateOnChange: true,
                validateOnBlur: false
            }).on('changed:after', _.bind(this.onRangeChange, this, 2)).on('button:click', _.bind(this.onSelectData, this, 2));

            this.chShowDropDown = new Common.UI.CheckBox({
                el: $window.find('#data-validation-ch-show-dropdown'),
                labelText: this.textShowDropDown,
                value: true
            });
            this.chShowDropDown.on('change', _.bind(this.onDropDownChange, this));

            this.lblRangeSource = $window.find('#data-validation-label-source');
            this.inputRangeSource = new Common.UI.InputFieldBtn({
                el: $window.find('#data-validation-txt-source'),
                style: '100%',
                textSelectData: 'Select data',
                // validateOnChange: true,
                validateOnBlur: false
            }).on('changed:after', _.bind(this.onRangeChange, this, 3)).on('button:click', _.bind(this.onSelectData, this, 3));

            this.chApply = new Common.UI.CheckBox({
                el: $window.find('#data-validation-ch-apply'),
                labelText: this.textApply
            });
            // this.chApply.on('change', _.bind(this.onApplyChange, this));

            // input message
            this.chShowInput = new Common.UI.CheckBox({
                el: $window.find('#data-validation-ch-show-input'),
                labelText: this.textShowInput,
                value: true
            });
            this.chShowInput.on('change', _.bind(this.onShowInputChange, this));

            this.inputInputTitle = new Common.UI.InputField({
                el: $window.find('#data-validation-input-title'),
                allowBlank  : true,
                validateOnBlur: false,
                style       : 'width: 100%;'
            }).on('changed:after', function() {
                me.isInputTitleChanged = true;
            });

            this.textareaInput = new Common.UI.TextareaField({
                el          : $window.find('#data-validation-input-msg'),
                style       : 'width: 100%; height: 70px;',
                value       : ''
            });
            this.textareaInput.on('changed:after', function() {
                me.isInputChanged = true;
            });

            // error message
            this.chShowError = new Common.UI.CheckBox({
                el: $window.find('#data-validation-ch-show-error'),
                labelText: this.textShowError,
                value: true
            });
            this.chShowError.on('change', _.bind(this.onShowErrorChange, this));

            this.cmbStyle = new Common.UI.ComboBox({
                el: $window.find('#data-validation-cmb-style'),
                cls: 'input-group-nr',
                editable: false,
                data: [
                    {value: Asc.c_oAscEDataValidationErrorStyle.Stop, clsText: 'error', displayValue: this.textStop},
                    {value: Asc.c_oAscEDataValidationErrorStyle.Warning, clsText: 'warn', displayValue: this.textAlert},
                    {value: Asc.c_oAscEDataValidationErrorStyle.Information, clsText: 'info', displayValue: this.textMessage}
                ],
                style: 'width: 95px;',
                menuStyle   : 'min-width: 95px;',
                takeFocusOnClose: true
            });
            this.cmbStyle.setValue(Asc.c_oAscEDataValidationErrorStyle.Stop);
            this.cmbStyle.on('selected', _.bind(this.onStyleSelect, this));

            this.inputErrorTitle = new Common.UI.InputField({
                el: $window.find('#data-validation-error-title'),
                allowBlank  : true,
                validateOnBlur: false,
                style       : 'width: 100%;'
            }).on('changed:after', function() {
                me.isErrorTitleChanged = true;
            });

            this.textareaError = new Common.UI.TextareaField({
                el          : $window.find('#data-validation-error-msg'),
                style       : 'width: 100%; height: 70px;',
                value       : ''
            });
            this.textareaError.on('changed:after', function() {
                me.isErrorChanged = true;
            });

            this.minMaxTr = $window.find('#data-validation-txt-min').closest('tr');
            this.sourceTr = $window.find('#data-validation-txt-source').closest('tr');
            this.dropdownTr = $window.find('#data-validation-ch-show-dropdown').closest('tr');
            this.errorIcon = $window.find('#data-validation-img-style');

            this.afterRender();
        },

        afterRender: function() {
            this._setDefaults(this.props);
            if (this.storageName) {
                var value = Common.localStorage.getItem(this.storageName);
                this.setActiveCategory((value!==null) ? parseInt(value) : 0);
            }
        },

        getFocusedComponents: function() {
            return [
                this.cmbAllow, this.cmbData, this.inputRangeSource, this.inputRangeMin, this.inputRangeMax, // 0 tab
                this.inputInputTitle, this.textareaInput,  // 1 tab
                this.cmbStyle, this.inputErrorTitle, this.textareaError  // 2 tab
            ];
        },

        onCategoryClick: function(btn, index) {
            Common.Views.AdvancedSettingsWindow.prototype.onCategoryClick.call(this, btn, index);

            var me = this;
            setTimeout(function(){
                switch (index) {
                    case 0:
                        me.cmbAllow.focus();
                        break;
                    case 1:
                        me.inputInputTitle.focus();
                        break;
                    case 2:
                        me.cmbStyle.focus();
                        break;
                }
            }, 10);
        },

        show: function() {
            Common.Views.AdvancedSettingsWindow.prototype.show.apply(this, arguments);
        },

        onSelectData: function(type, input) {
            var me = this;
            if (me.api) {
                var handlerDlg = function(dlg, result) {
                    if (result == 'ok') {
                        var val = dlg.getSettings();
                        input.setValue(val);
                        me.onRangeChange(type, input, val);
                    }
                };

                var win = new SSE.Views.CellRangeDialog({
                    handler: handlerDlg
                }).on('close', function() {
                    me.show();
                    setTimeout(function(){
                        me._noApply = true;
                        input.focus();
                        me._noApply = false;
                    },1);
                });

                var xy = me.$window.offset();
                me.hide();
                win.show(xy.left + 160, xy.top + 125);
                win.setSettings({
                    api     : me.api,
                    range   : input.getValue(),
                    type    : Asc.c_oAscSelectionDialogType.Chart,
                    validation: function() {return true;}
                });
            }
        },

        onRangeChange: function(type, input, newValue, oldValue, e) {
            if (newValue == oldValue) return;
            if (!this._noApply) {
                if (type==1 || type==3)
                    this.props.asc_setFormula1(newValue);
                else if (type==2)
                    this.props.asc_setFormula2(newValue);
            }
        },

        onAllowSelect: function(combo, record) {
            this.ShowHideElem();
            if (!this._noApply)
                this.props.asc_setType(record.value);
            this.inputRangeMin.setValue(this.props.asc_getFormula1() || '');
            this.inputRangeSource.setValue(this.props.asc_getFormula1() || '');
            this.inputRangeMax.setValue(this.props.asc_getFormula2() || '');
        },

        onDataSelect: function(combo, record) {
            this.ShowHideElem();
            if (!this._noApply)
                this.props.asc_setOperator(record.value);
            this.inputRangeMin.setValue(this.props.asc_getFormula1() || '');
            this.inputRangeSource.setValue(this.props.asc_getFormula1() || '');
            this.inputRangeMax.setValue(this.props.asc_getFormula2() || '');
        },

        onStyleSelect: function(combo, record) {
            this.errorIcon.removeClass("error warn info");
            this.errorIcon.addClass(record.clsText);
        },

        onIgnoreChange: function(field, newValue, oldValue, eOpts) {
            if (!this._noApply) {
                this.props.asc_setAllowBlank(field.getValue()!=='checked');
            }
        },

        onDropDownChange: function(field, newValue, oldValue, eOpts) {
            if (!this._noApply) {
                this.props.asc_setShowDropDown(field.getValue()=='checked');
            }
        },

        onShowInputChange: function(field, newValue, oldValue, eOpts) {
            var checked = (field.getValue()=='checked');
            this.inputInputTitle.setDisabled(!checked);
            this.textareaInput.setDisabled(!checked);

            if (this.api && !this._noApply) {
                this.props.asc_setShowInputMessage(field.getValue()=='checked');
            }
        },

        onShowErrorChange: function(field, newValue, oldValue, eOpts) {
            var checked = (field.getValue()=='checked');
            this.inputErrorTitle.setDisabled(!checked);
            this.cmbStyle.setDisabled(!checked);
            this.textareaError.setDisabled(!checked);

            if (this.api && !this._noApply) {
                this.props.asc_setShowErrorMessage(field.getValue()=='checked');
            }
        },

        _setDefaults: function (props) {
            this._noApply = true;
            if (props) {
                var value = props.asc_getAllowBlank();
                this.chIgnore.setValue(!value, true);
                value = props.asc_getShowDropDown();
                this.chShowDropDown.setValue(!!value, true);
                value = props.asc_getType();
                this.cmbAllow.setValue(value!==null ? value : Asc.EDataValidationType.None, true);
                value = props.asc_getOperator();
                this.cmbData.setValue(value!==null ? value : Asc.EDataValidationOperator.Between, true);
                this.inputRangeMin.setValue(props.asc_getFormula1() || '');
                this.inputRangeSource.setValue(props.asc_getFormula1() || '');
                this.inputRangeMax.setValue(props.asc_getFormula2() || '');

                // input
                this.chShowInput.setValue(!!props.asc_getShowInputMessage());
                this.inputInputTitle.setValue(props.asc_getPromptTitle() || '');
                this.textareaInput.setValue(props.asc_getPrompt() || '');

                // error
                this.chShowError.setValue(!!props.asc_getShowErrorMessage());
                this.inputErrorTitle.setValue(props.asc_getErrorTitle() || '');
                this.textareaError.setValue(props.asc_getError() || '');
                value = props.asc_getErrorStyle();
                this.cmbStyle.setValue(value!==null ? value : Asc.EDataValidationErrorStyle.Stop);

            }
            this.ShowHideElem();
            this._noApply = false;
        },

        getSettings: function () {
            if (this.isInputTitleChanged)
                this.props.asc_setPromptTitle(this.inputInputTitle.getValue());
            if (this.isInputChanged)
                this.props.asc_setPrompt(this.textareaInput.getValue());
            if (this.isErrorTitleChanged)
                this.props.asc_setErrorTitle(this.inputErrorTitle.getValue());
            if (this.isErrorChanged)
                this.props.asc_setError(this.textareaError.getValue());
            return this.props;
        },

        onDlgBtnClick: function(event) {
            var me = this;
            var state = (typeof(event) == 'object') ? event.currentTarget.attributes['result'].value : event;
            if (state == 'ok') {
                this.handler && this.handler.call(this, state,  (state == 'ok') ? this.getSettings() : undefined);
            }

            this.close();
        },

        onPrimary: function() {
            this.onDlgBtnClick('ok');
            return false;
        },

        ShowHideElem: function() {
            var allow = this.cmbAllow.getValue(),
                data = this.cmbData.getValue();
            var between = (data==Asc.EDataValidationOperator.Between || data==Asc.EDataValidationOperator.NotBetween);
            var source = (allow==Asc.EDataValidationType.Custom || allow==Asc.EDataValidationType.List);
            this.minMaxTr.toggleClass('hidden', allow==Asc.EDataValidationType.None || source || !between);
            this.sourceTr.toggleClass('hidden', allow==Asc.EDataValidationType.None || !source && between );
            this.dropdownTr.toggleClass('hidden', allow!=Asc.EDataValidationType.List);

            this.chIgnore.setDisabled(allow===Asc.EDataValidationType.None);
            this.cmbData.setDisabled(allow===Asc.EDataValidationType.None || allow===Asc.EDataValidationType.Custom || allow===Asc.EDataValidationType.List);

            var str = this.textSource;
            if (allow==Asc.EDataValidationType.Custom)
                str = this.textFormula;
            else if (data==Asc.EDataValidationOperator.Equal || data==Asc.EDataValidationOperator.NotEqual) { // equals, not equals
                if (allow==Asc.EDataValidationType.Date)
                    str = this.txtDate;
                else if (allow==Asc.EDataValidationType.TextLength)
                    str = this.txtLength;
                else if (allow==Asc.EDataValidationType.Time)
                    str = this.txtElTime;
                else
                    str = this.textCompare;
            } else if (data==Asc.EDataValidationOperator.GreaterThan || data==Asc.EDataValidationOperator.GreaterThanOrEqual) { // greater, greater or equals
                if (allow==Asc.EDataValidationType.Date)
                    str = this.txtStartDate;
                else if (allow==Asc.EDataValidationType.Time)
                    str = this.txtStartTime;
                else
                    str = this.textMin;
            } else if (data==Asc.EDataValidationOperator.LessThan || data==Asc.EDataValidationOperator.LessThanOrEqual) { // less, less or equals
                if (allow==Asc.EDataValidationType.Date)
                    str = this.txtEndDate;
                else if (allow==Asc.EDataValidationType.Time)
                    str = this.txtEndTime;
                else
                    str = this.textMax;
            }
            this.lblRangeSource.text(str);

            var str1 = this.textMin,
                str2 = this.textMax;
            if (allow==Asc.EDataValidationType.Date) {
                str1 = this.txtStartDate;
                str2 = this.txtEndDate;
            } else if (allow==Asc.EDataValidationType.Time) {
                str1 = this.txtStartTime;
                str2 = this.txtEndTime;
            }
            this.lblRangeMin.text(str1);
            this.lblRangeMax.text(str2);
        },

        strSettings: 'Settings',
        strInput: 'Input Message',
        strError: 'Error Alert',
        textAllow: 'Allow',
        textData: 'Data',
        textMin: 'Minimum',
        textMax: 'Maximum',
        textCompare: 'Compare to',
        textSource: 'Source',
        textStartDate: 'Start Date',
        textEndDate: 'End Date',
        textStartTime: 'Start Time',
        textEndTime: 'End Time',
        textFormula: 'Formula',
        textIgnore: 'Ignore blank',
        textApply: 'Apply these changes to all othes calls the same settings',
        textShowDropDown: 'Show drop-down list in cell',
        textCellSelected: 'When cell is selected, show this input message',
        textTitle: 'Title',
        textInput: 'Input Message',
        textUserEnters: 'When user enters invalid data, show this error alert',
        textStyle: 'Style',
        textError: 'Error Message',
        textShowInput: 'Show input message when cell is selected',
        textShowError: 'Show error alert after invalid data is entered',
        txtBetween: 'between',
        txtNotBetween: 'not between',
        txtEqual: 'equals',
        txtNotEqual: 'does not equal',
        txtLessThan: 'less than',
        txtGreaterThan: 'greater than',
        txtLessThanOrEqual: 'less than or equal to',
        txtGreaterThanOrEqual: 'greater than or equal to',
        txtAny: 'Any value',
        txtWhole: 'Whole number',
        txtDecimal: 'Decimal',
        txtList: 'List',
        txtDate: 'Date',
        txtTime: 'Time',
        txtTextLength: 'Text length',
        txtLength: 'Length',
        txtOther: 'Other',
        txtElTime: 'Elapsed time',
        txtStartDate: 'Start date',
        txtStartTime: 'Start time',
        txtEndDate: 'End date',
        txtEndTime: 'End time',
        textStop: 'Stop',
        textAlert: 'Alert',
        textMessage: 'Message'

    }, SSE.Views.DataValidationDialog || {}))
});