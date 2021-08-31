import React, { useContext } from 'react';
import { f7 } from 'framework7-react';
import { inject, observer } from "mobx-react";
import { withTranslation} from 'react-i18next';
import { LocalStorage } from '../../../../common/mobile/utils/LocalStorage';

import ContextMenuController from '../../../../common/mobile/lib/controller/ContextMenu';
import { idContextMenuElement } from '../../../../common/mobile/lib/view/ContextMenu';
import { Device } from '../../../../common/mobile/utils/device';
import EditorUIController from '../lib/patch';

@inject ( stores => ({
    isEdit: stores.storeAppOptions.isEdit,
    canComments: stores.storeAppOptions.canComments,
    canViewComments: stores.storeAppOptions.canViewComments,
    canCoAuthoring: stores.storeAppOptions.canCoAuthoring,
    users: stores.users,
    isDisconnected: stores.users.isDisconnected,
    storeSheets: stores.sheets
}))
class ContextMenu extends ContextMenuController {
    constructor(props) {
        super(props);

        // console.log('context menu controller created');
        this.onApiShowComment = this.onApiShowComment.bind(this);
        this.onApiHideComment = this.onApiHideComment.bind(this);
        this.isOpenWindowUser = false;
        this.timer;
        this.getUserName = this.getUserName.bind(this);
        this.onApiMouseMove = this.onApiMouseMove.bind(this);
    }

    static closeContextMenu() {
        f7.popover.close(idContextMenuElement, false);
    }

    getUserName(id) {
        const user = this.props.users.searchUserByCurrentId(id);
        return AscCommon.UserInfoParser.getParsedName(user.asc_getUserName());
    }

    componentWillUnmount() {
        super.componentWillUnmount();

        const api = Common.EditorApi.get();
        api.asc_unregisterCallback('asc_onShowComment', this.onApiShowComment);
        api.asc_unregisterCallback('asc_onHideComment', this.onApiHideComment);
        api.asc_unregisterCallback('asc_onMouseMove', this.onApiMouseMove);
    }


    onApiShowComment(comments) {
        this.isComments = comments && comments.length > 0;
    }

    onApiHideComment() {
        this.isComments = false;
    }

    // onMenuClosed() {
    //     super.onMenuClosed();
    // }

    onMenuItemClick(action) {
        const { t } = this.props;
        const _t = t("ContextMenu", { returnObjects: true });

        super.onMenuItemClick(action);

        if ( EditorUIController.ContextMenu && EditorUIController.ContextMenu.handleMenuItemClick(this, action) )
            return;

        const api = Common.EditorApi.get();
        const info = api.asc_getCellInfo();
        switch (action) {
            case 'cut':
                if (!LocalStorage.getBool("sse-hide-copy-cut-paste-warning")) {
                    this.showCopyCutPasteModal();
                }
                break;
            case 'copy':
                if (!api.asc_Copy() && !LocalStorage.getBool("sse-hide-copy-cut-paste-warning")) {
                    this.showCopyCutPasteModal();
                }
                break;
            case 'paste':
                if (!LocalStorage.getBool("sse-hide-copy-cut-paste-warning")) {
                    this.showCopyCutPasteModal();
                }
                break;
            case 'viewcomment':
                Common.Notifications.trigger('viewcomment');
                break;
            case 'openlink':
                const linkinfo = info.asc_getHyperlink();
                if ( linkinfo.asc_getType() == Asc.c_oAscHyperlinkType.RangeLink ) {
                    const nameSheet = linkinfo.asc_getSheet();
                    const curActiveSheet = api.asc_getActiveWorksheetIndex();
                    api.asc_setWorksheetRange(linkinfo);
                    const {storeSheets} = this.props;
                    const tab = storeSheets.sheets.find((sheet) => sheet.name === nameSheet);
                    if (tab) {
                        const sdkIndex = tab.index;
                        if (sdkIndex !== curActiveSheet) {
                            const index = storeSheets.sheets.indexOf(tab);
                            storeSheets.setActiveWorksheet(index);
                            Common.Notifications.trigger('sheet:active', sdkIndex);
                        }
                    }
                } else {
                    const url = linkinfo.asc_getHyperlinkUrl().replace(/\s/g, "%20");
                    api.asc_getUrlType(url) > 0 && this.openLink(url);
                }
                break;
        }
    }

    onMergeCells() {
        const { t } = this.props;
        const _t = t("ContextMenu", { returnObjects: true });
        const api = Common.EditorApi.get();
        if (api.asc_mergeCellsDataLost(Asc.c_oAscMergeOptions.Merge)) {
            setTimeout(() => {
                f7.dialog.confirm(_t.warnMergeLostData, _t.notcriticalErrorTitle, () => {
                    api.asc_mergeCells(Asc.c_oAscMergeOptions.Merge);
                });
            }, 0);
        } else {
            api.asc_mergeCells(Asc.c_oAscMergeOptions.Merge);
        }
    }

    showCopyCutPasteModal() {
        const { t } = this.props;
        const _t = t("ContextMenu", { returnObjects: true });
        f7.dialog.create({
            title: _t.textCopyCutPasteActions,
            text: _t.errorCopyCutPaste,
            content: `<div class="checkbox-in-modal">
                      <label class="checkbox">
                        <input type="checkbox" name="checkbox-show" />
                        <i class="icon-checkbox"></i>
                      </label>
                      <span class="right-text">${_t.textDoNotShowAgain}</span>
                      </div>`,
            buttons: [{
                text: 'OK',
                onClick: () => {
                    const dontShow = $$('input[name="checkbox-show"]').prop('checked');
                    if (dontShow) LocalStorage.setItem("sse-hide-copy-cut-paste-warning", 1);
                }
            }]
        }).open();
    }

    openLink(url) {
        const newDocumentPage = window.open(url, '_blank');

        if (newDocumentPage) {
            newDocumentPage.focus();
        }
    }

    onDocumentReady() {
        super.onDocumentReady();

        const api = Common.EditorApi.get();
        api.asc_registerCallback('asc_onShowComment', this.onApiShowComment);
        api.asc_registerCallback('asc_onHideComment', this.onApiHideComment);
        api.asc_registerCallback('asc_onMouseMove', this.onApiMouseMove);
    }

    initMenuItems() {
        if ( !Common.EditorApi ) return [];

        const { t } = this.props;
        const _t = t("ContextMenu", { returnObjects: true });

        const { isEdit } = this.props;

        if (isEdit && EditorUIController.ContextMenu) {
            return EditorUIController.ContextMenu.mapMenuItems(this);
        } else {
            const {canViewComments, canCoAuthoring, canComments } = this.props;

            const api = Common.EditorApi.get();
            const cellinfo = api.asc_getCellInfo();

            const itemsIcon = [];
            const itemsText = [];

            let iscellmenu, isrowmenu, iscolmenu, isallmenu, ischartmenu, isimagemenu, istextshapemenu, isshapemenu, istextchartmenu;
            const seltype = cellinfo.asc_getSelectionType();
            const hasComments = cellinfo.asc_getComments(); //prohibit adding multiple comments in one cell;

            switch (seltype) {
                case Asc.c_oAscSelectionType.RangeCells:     iscellmenu  = true;     break;
                case Asc.c_oAscSelectionType.RangeRow:       isrowmenu   = true;     break;
                case Asc.c_oAscSelectionType.RangeCol:       iscolmenu   = true;     break;
                case Asc.c_oAscSelectionType.RangeMax:       isallmenu   = true;     break;
                case Asc.c_oAscSelectionType.RangeImage:     isimagemenu = true;     break;
                case Asc.c_oAscSelectionType.RangeShape:     isshapemenu = true;     break;
                case Asc.c_oAscSelectionType.RangeChart:     ischartmenu = true;     break;
                case Asc.c_oAscSelectionType.RangeChartText: istextchartmenu = true; break;
                case Asc.c_oAscSelectionType.RangeShapeText: istextshapemenu = true; break;
            }

            itemsIcon.push({
                event: 'copy',
                icon: 'icon-copy'
            });

            if (iscellmenu && cellinfo.asc_getHyperlink()) {
                itemsText.push({
                    caption: _t.menuOpenLink,
                    event: 'openlink'
                });
            }
            if (canViewComments && hasComments && hasComments.length>0) {
                itemsText.push({
                    caption: _t.menuViewComment,
                    event: 'viewcomment'
                });
            }

            if (iscellmenu && !api.isCellEdited && canCoAuthoring && canComments && hasComments && hasComments.length<1) {
                itemsText.push({
                    caption: _t.menuAddComment,
                    event: 'addcomment'
                });
            }

            return itemsIcon.concat(itemsText);
        }
    }

    onApiMouseMove(dataarray) {
        let index_hyperlink,
            index_comments,
            index_locked,
            index_column, index_row,
            index_filter,
            index_slicer,
            index_foreign;
        for (let i = dataarray.length; i > 0; i--) {
            switch (dataarray[i-1].asc_getType()) {
                case Asc.c_oAscMouseMoveType.Hyperlink:
                    index_hyperlink = i;
                    break;
                case Asc.c_oAscMouseMoveType.Comment:
                    index_comments = i;
                    break;
                case Asc.c_oAscMouseMoveType.LockedObject:
                    index_locked = i;
                    break;
                case Asc.c_oAscMouseMoveType.ResizeColumn:
                    index_column = i;
                    break;
                case Asc.c_oAscMouseMoveType.ResizeRow:
                    index_row = i;
                    break;
                case Asc.c_oAscMouseMoveType.Filter:
                    index_filter = i;
                    break;
                case Asc.c_oAscMouseMoveType.Tooltip:
                    index_slicer = i;
                    break;
                case Asc.c_oAscMouseMoveType.ForeignSelect:
                    index_foreign = i;
                    break;
            }
        }

        if (!index_locked && this.isOpenWindowUser) {
            this.timer = setTimeout(() => $$('.username-tip').remove(), 1500);
            this.isOpenWindowUser = false;
        } else {
            clearTimeout(this.timer);
            $$('.username-tip').remove();
        }

        if (index_locked ) {
            const tipHeight = 20;
            let editorOffset = $$("#editor_sdk").offset(),
                XY = [ editorOffset.left -  $(window).scrollLeft(), editorOffset.top - $(window).scrollTop()],
                data = dataarray[index_locked - 1],
                X = data.asc_getX(),
                Y = data.asc_getY(),
                src = $$(`<div class="username-tip"></div>`);

            src.css({
                height      : tipHeight + 'px',
                position    : 'absolute',
                zIndex      : '5000',
                visibility  : 'visible',
            });

            src.text(this.getUserName(data.asc_getUserId()));
            src.addClass('active');
            $$(document.body).append(src);

            let showPoint = [ ($$(window).width() - (X + XY[0])), Y + XY[1] ];

            if ( $$(window).width() - showPoint[0] < src.outerWidth() ) {
                src.css({
                    left:  '0px',
                    top: (showPoint[1] - tipHeight)  + 'px',
                });
            } else {
                src.css({
                    right: showPoint[0] + 'px',
                    top: showPoint[1] - 1 + 'px',
                });
            }
            this.isOpenWindowUser = true;
        }
    }

    initExtraItems () {
        return (this.extraItems && this.extraItems.length > 0 ? this.extraItems : []);
    }
}

const _ContextMenu = withTranslation()(ContextMenu);
_ContextMenu.closeContextMenu = ContextMenu.closeContextMenu;
export { _ContextMenu as default };