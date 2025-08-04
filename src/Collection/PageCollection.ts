import { Orientation, Render } from '../Render/Render';
import { Page, PageDensity } from '../Page/Page';
import { PageFlip } from '../PageFlip';
import { FlipDirection } from '../Flip/Flip';

type NumberArray = number[];

/**
 * Сlass representing a collection of pages
 */
export abstract class PageCollection {
    protected readonly app: PageFlip;
    protected readonly render: Render;
    protected readonly isShowCover: boolean;

    /** Pages List */
    protected pages: Page[] = [];
    /** Index of the current page in list */
    protected currentPageIndex = 0;

    /** 가상화 페이지 */
    protected realPageIndex = 0;
    protected totalVirtualPages = 0;

    /** Number of the current spread in book */
    protected currentSpreadIndex = 0;
    /**  Two-page spread in landscape mode */
    protected landscapeSpread: NumberArray[] = [];
    /**  One-page spread in portrait mode */
    protected portraitSpread: NumberArray[] = [];

    protected constructor(app: PageFlip, render: Render) {
        this.render = render;
        this.app = app;

        this.currentPageIndex = 0;
        this.isShowCover = this.app.getSettings().showCover;

        this.totalVirtualPages = this.app.getSettings().totalVirtualPages;
    }

    /**
     * Load pages
     */
    public abstract load(): void;

    /**
     * Clear pages list
     */
    public destroy(): void {
        this.pages = [];
    }

    /**
     * Split the book on the two-page spread in landscape mode and one-page spread in portrait mode
     */
    protected createSpread(): void {
        this.landscapeSpread = [];
        this.portraitSpread = [];

        for (let i = 0; i < this.pages.length; i++) {
            this.portraitSpread.push([i]); // In portrait mode - (one spread = one page)
        }

        let start = 0;
        if (this.isShowCover) {
            this.pages[0].setDensity(PageDensity.HARD);
            this.landscapeSpread.push([start]);
            start++;
        }

        for (let i = start; i < this.pages.length; i += 2) {
            if (i < this.pages.length - 1) this.landscapeSpread.push([i, i + 1]);
            else {
                this.landscapeSpread.push([i]);
                this.pages[i].setDensity(PageDensity.HARD);
            }
        }
    }

    /**
     * Get spread by mode (portrait or landscape)
     */
    protected getSpread(): NumberArray[] {
        return this.render.getOrientation() === Orientation.LANDSCAPE
            ? this.landscapeSpread
            : this.portraitSpread;
    }

    /**
     * Get spread index by page number
     *
     * @param {number} pageNum - page index
     */
    public getSpreadIndexByPage(pageNum: number): number {
        const spread = this.getSpread();

        for (let i = 0; i < spread.length; i++)
            if (pageNum === spread[i][0] || pageNum === spread[i][1]) return i;

        return null;
    }

    /**
     * Get the total number of pages (considering cover mode and orientation)
     */
    public getPageCount(): number {
        if (!this.totalVirtualPages) {
            // 일반 모드: DOM 페이지 수 그대로
            return this.pages.length;
        }

        // 가상화 모드: 표지 설정과 모드에 따른 계산
        let virtualPages = this.totalVirtualPages;

        if (this.render.getOrientation() === Orientation.PORTRAIT) {
            // Portrait: 한 페이지씩 보이므로 그대로
            return virtualPages;
        } else {
            // Landscape: 두 페이지씩 보이므로 절반
            virtualPages = Math.ceil(this.totalVirtualPages / 2);

            // showCover가 true면 첫 페이지(표지)는 혼자 표시되므로 +1
            if (this.isShowCover) {
                virtualPages += 1;
            }
        }

        return virtualPages;
    }

    /**
     * Get the pages list
     */
    public getPages(): Page[] {
        return this.pages;
    }

    /**
     * Get page by index
     *
     * @param {number} pageIndex
     */
    public getPage(pageIndex: number): Page {
        if (pageIndex >= 0 && pageIndex < this.pages.length) {
            return this.pages[pageIndex];
        }

        throw new Error('Invalid page number');
    }

    /**
     * Get the next page from the specified
     *
     * @param {Page} current
     */
    public nextBy(current: Page): Page {
        const idx = this.pages.indexOf(current);

        if (idx < this.pages.length - 1) return this.pages[idx + 1];

        return null;
    }

    /**
     * Get previous page from specified
     *
     * @param {Page} current
     */
    public prevBy(current: Page): Page {
        const idx = this.pages.indexOf(current);

        if (idx > 0) return this.pages[idx - 1];

        return null;
    }

    /**
     * Get flipping page depending on the direction
     *
     * @param {FlipDirection} direction
     */
    public getFlippingPage(direction: FlipDirection): Page {
        const current = this.currentSpreadIndex;

        if (this.render.getOrientation() === Orientation.PORTRAIT) {
            return direction === FlipDirection.FORWARD
                ? this.pages[current].newTemporaryCopy()
                : this.pages[current - 1];
        } else {
            const spread =
                direction === FlipDirection.FORWARD
                    ? this.getSpread()[current + 1]
                    : this.getSpread()[current - 1];

            if (spread.length === 1) return this.pages[spread[0]];

            return direction === FlipDirection.FORWARD
                ? this.pages[spread[0]]
                : this.pages[spread[1]];
        }
    }

    /**
     * Get Next page at the time of flipping
     *
     * @param {FlipDirection}  direction
     */
    public getBottomPage(direction: FlipDirection): Page {
        const current = this.currentSpreadIndex;

        if (this.render.getOrientation() === Orientation.PORTRAIT) {
            return direction === FlipDirection.FORWARD
                ? this.pages[current + 1]
                : this.pages[current - 1];
        } else {
            const spread =
                direction === FlipDirection.FORWARD
                    ? this.getSpread()[current + 1]
                    : this.getSpread()[current - 1];

            if (spread.length === 1) return this.pages[spread[0]];

            return direction === FlipDirection.FORWARD
                ? this.pages[spread[1]]
                : this.pages[spread[0]];
        }
    }

    /**
     * Show next spread with virtualization logic
     * 정상구간이 기존 로직, 이외의 부분 진수 추가 25.08.04
     */
    public showNext(): void {
        const maxPages = this.getPageCount(); // getPageCount() 사용으로 통일
        if (this.realPageIndex < maxPages - 1) {
            this.realPageIndex++; // 실제 페이지 인덱스 증가

            if (this.isInLoopZone()) {
                // 루프 구간: currentSpreadIndex는 중간에 고정하고 내용만 업데이트
                this.showSpread();
            } else {
                // 정상 구간: 기존 로직대로 페이지 이동
                if (this.currentSpreadIndex < this.getSpread().length - 1) {
                    this.currentSpreadIndex++;
                    this.showSpread();
                }
            }
        }
    }
    /**
     * Show prev spread with virtualization logic
     * 정상구간이 기존 로직, 이외의 부분 진수 추가 25.08.04
     */
    public showPrev(): void {
        if (this.realPageIndex > 0) {
            this.realPageIndex--; // 실제 페이지 인덱스 감소

            if (this.isInLoopZone()) {
                // 루프 구간: currentSpreadIndex는 중간에 고정하고 내용만 업데이트
                this.showSpread();
            } else {
                // 정상 구간: 기존 로직대로 페이지 이동
                if (this.currentSpreadIndex > 0) {
                    this.currentSpreadIndex--;
                    this.showSpread();
                }
            }
        }
    }

    /**
     * Get the number of the current spread in book
     */
    public getCurrentPageIndex(): number {
        return this.currentPageIndex;
    }

    /**
     * Show specified page
     * @param {number} pageNum - Page index (from 0s)
     */
    public show(pageNum: number = null): void {
        if (pageNum === null) pageNum = this.currentPageIndex;

        if (pageNum < 0 || pageNum >= this.pages.length) return;

        const spreadIndex = this.getSpreadIndexByPage(pageNum);
        if (spreadIndex !== null) {
            this.currentSpreadIndex = spreadIndex;
            this.showSpread();
        }
    }

    /**
     * Index of the current page in list
     */
    public getCurrentSpreadIndex(): number {
        return this.currentSpreadIndex;
    }

    /**
     * Set new spread index as current
     *
     * @param {number} newIndex - new spread index
     */
    public setCurrentSpreadIndex(newIndex: number): void {
        if (newIndex >= 0 && newIndex < this.getSpread().length) {
            this.currentSpreadIndex = newIndex;
        } else {
            throw new Error('Invalid page');
        }
    }

    /**
     * Show current spread
     * 25.08.04 진수 추가 루프 발생 중 실제 페이지 반환
     */
    private showSpread(): void {
        const spread = this.getSpread()[this.currentSpreadIndex];

        if (spread.length === 2) {
            this.render.setLeftPage(this.pages[spread[0]]);
            this.render.setRightPage(this.pages[spread[1]]);
        } else {
            if (this.render.getOrientation() === Orientation.LANDSCAPE) {
                if (spread[0] === this.pages.length - 1) {
                    this.render.setLeftPage(this.pages[spread[0]]);
                    this.render.setRightPage(null);
                } else {
                    this.render.setLeftPage(null);
                    this.render.setRightPage(this.pages[spread[0]]);
                }
            } else {
                this.render.setLeftPage(null);
                this.render.setRightPage(this.pages[spread[0]]);
            }
        }

        this.currentPageIndex = spread[0];
        if (this.totalVirtualPages) {
            this.app.updatePageIndex(this.realPageIndex);
        } else {
            this.app.updatePageIndex(this.currentPageIndex);
        }
    }

    /**
     * Get the middle index for loop (중간 위치 계산)
     */
    private getLoopCenterIndex(): number {
        return Math.floor(this.getSpread().length / 2);
    }

    /**
     * Check if currently in loop zone
     */
    public isInLoopZone(): boolean {
        // 가상화 모드가 아니면 항상 false (정상 구간으로 처리)
        if (!this.totalVirtualPages) return false;

        const centerIndex = this.getLoopCenterIndex();
        return (
            this.realPageIndex >= centerIndex &&
            this.realPageIndex < this.totalVirtualPages - centerIndex
        );
    }
}
