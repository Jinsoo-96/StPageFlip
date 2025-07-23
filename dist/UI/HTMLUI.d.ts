import { UI } from './UI';
import { PageFlip } from '../PageFlip';
import { FlipSetting } from '../Settings';
/**
 * UI for HTML mode
 */
export declare class HTMLUI extends UI {
    private items;
    constructor(inBlock: HTMLElement, app: PageFlip, setting: FlipSetting, items: NodeListOf<HTMLElement> | HTMLElement[]);
    clear(): void;
    /**
     * Update page list from HTMLElements
     *
     * @param {(NodeListOf<HTMLElement>|HTMLElement[])} items - List of pages as HTML Element
     */
    updateItems(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
    update(): void;
    /**
     * 애니메이션 없이 바로 첫 페이지를 중앙에 위치시킴
     */
    setInitialCenterPosition(): void;
    firstPageCenterWithAnimation(): void;
    firstPageEndCenterWithAnimation(): void;
    firstPageCenterReverseWithAnimation(): void;
}
