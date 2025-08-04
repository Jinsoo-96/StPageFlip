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
    /** Number of the current spread in book */
    protected currentSpreadIndex: number;
    /**  Two-page spread in landscape mode */
    protected landscapeSpread: NumberArray[];
    /**  One-page spread in portrait mode */
    protected portraitSpread: NumberArray[];
    /** 가상화 모드 활성화 여부 */
    protected isVirtualMode: boolean;
    /** 논리적 현재 페이지 인덱스 (가상화 모드에서 사용) */
    protected virtualCurrentPageIndex: number;
    protected virtualSpreadMap: {
        start: number[];
        middle: number[];
        end: number[];
        threshold: number;
    };
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
     * 🎯 가상화 스프레드 매핑 설정
     */
    private setupVirtualSpreadMapping;
    /**
     * 🎯 가상 페이지 인덱스에 해당하는 실제 스프레드 인덱스 반환
     */
    private getVirtualSpreadIndex;
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
     * Show next spread
     */
    showNext(): void;
    /**
     * Show prev spread
     */
    showPrev(): void;
    /**
     * Get the number of the current page in list
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
     * 🎯 가상화 모드 상태 반환
     */
    isVirtualization(): boolean;
    /**
     * 🎯 가상 페이지 인덱스 설정 (외부에서 호출 가능)
     */
    setVirtualPageIndex(pageIndex: number): void;
    /**
     * Show current spread
     */
    private showSpread;
}
export {};
