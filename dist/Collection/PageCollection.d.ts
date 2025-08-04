import { Render } from '../Render/Render';
import { Page } from '../Page/Page';
import { PageFlip } from '../PageFlip';
import { FlipDirection } from '../Flip/Flip';
type NumberArray = number[];
/**
 * Сlass representing a collection of pages
 */
export declare abstract class PageCollection {
    protected readonly app: PageFlip;
    protected readonly render: Render;
    protected readonly isShowCover: boolean;
    /** Pages List */
    protected pages: Page[];
    /** Index of the current page in list */
    protected currentPageIndex: number;
    /** 가상화 페이지 */
    protected realPageIndex: number;
    protected totalVirtualPages: number;
    /** Number of the current spread in book */
    protected currentSpreadIndex: number;
    /**  Two-page spread in landscape mode */
    protected landscapeSpread: NumberArray[];
    /**  One-page spread in portrait mode */
    protected portraitSpread: NumberArray[];
    protected constructor(app: PageFlip, render: Render);
    /**
     * Load pages
     */
    abstract load(): void;
    /**
     * Clear pages list
     */
    destroy(): void;
    /**
     * Split the book on the two-page spread in landscape mode and one-page spread in portrait mode
     */
    protected createSpread(): void;
    /**
     * Get spread by mode (portrait or landscape)
     */
    protected getSpread(): NumberArray[];
    /**
     * Get spread index by page number
     *
     * @param {number} pageNum - page index
     */
    getSpreadIndexByPage(pageNum: number): number;
    /**
     * Get the total number of pages
     */
    getPageCount(): number;
    /**
     * Get the pages list
     */
    getPages(): Page[];
    /**
     * Get page by index
     *
     * @param {number} pageIndex
     */
    getPage(pageIndex: number): Page;
    /**
     * Get the next page from the specified
     *
     * @param {Page} current
     */
    nextBy(current: Page): Page;
    /**
     * Get previous page from specified
     *
     * @param {Page} current
     */
    prevBy(current: Page): Page;
    /**
     * Get flipping page depending on the direction
     *
     * @param {FlipDirection} direction
     */
    getFlippingPage(direction: FlipDirection): Page;
    /**
     * Get Next page at the time of flipping
     *
     * @param {FlipDirection}  direction
     */
    getBottomPage(direction: FlipDirection): Page;
    /**
     * Show next spread with virtualization logic
     * 정상구간이 기존 로직, 이외의 부분 진수 추가 25.08.04
     */
    showNext(): void;
    /**
     * Show prev spread with virtualization logic
     * 정상구간이 기존 로직, 이외의 부분 진수 추가 25.08.04
     */
    showPrev(): void;
    /**
     * Get the number of the current spread in book
     */
    getCurrentPageIndex(): number;
    /**
     * Show specified page
     * @param {number} pageNum - Page index (from 0s)
     */
    show(pageNum?: number): void;
    /**
     * Index of the current page in list
     */
    getCurrentSpreadIndex(): number;
    /**
     * Set new spread index as current
     *
     * @param {number} newIndex - new spread index
     */
    setCurrentSpreadIndex(newIndex: number): void;
    /**
     * Show current spread
     * 25.08.04 진수 추가 루프 발생 중 실제 페이지 반환
     */
    private showSpread;
    /**
     * Get the middle index for loop (중간 위치 계산)
     */
    private getLoopCenterIndex;
    /**
     * Check if currently in loop zone
     */
    isInLoopZone(): boolean;
}
export {};
