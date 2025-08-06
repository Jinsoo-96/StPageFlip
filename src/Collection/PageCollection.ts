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

    /** Number of the current spread in book */
    protected currentSpreadIndex = 0;
    /**  Two-page spread in landscape mode */
    protected landscapeSpread: NumberArray[] = [];
    /**  One-page spread in portrait mode */
    protected portraitSpread: NumberArray[] = [];

    /** 가상화 로직을 위해 진수 추가 25.08.05 */
    protected virtualPageIndex = 0; // 현재 가상 페이지 인덱스
    protected virtualSpreadIndex = 0; // 현재 가상 스프레드 인덱스
    protected virtualLandscapeSpread: NumberArray[] = [];
    protected virtualPortraitSpread: NumberArray[] = [];
    protected totalVirtualPages = 0; // 전체 가상 페이지 수

    /** 루프 존 관련 캐시 */
    // protected loopZoneStart = 0;
    // protected loopZoneEnd = 0;
    // protected loopSpreadIndex = 0;

    /** 루프 존 관련 캐시 - orientation별로 분리 */
    protected portraitLoopZone = {
        start: 0,
        end: 0,
        centerIndex: 0,
    };
    protected landscapeLoopZone = {
        start: 0,
        end: 0,
        centerIndex: 0,
    };

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

        // 루프 존 계산 (스프레드 생성 후)
        this.calculateLoopZone();
    }

    /**
     * Get spread by mode (portrait or landscape)
     */
    protected getSpread(useVirtual: boolean = false): NumberArray[] {
        if (useVirtual) {
            return this.render.getOrientation() === Orientation.LANDSCAPE
                ? this.virtualLandscapeSpread
                : this.virtualPortraitSpread;
        } else {
            return this.render.getOrientation() === Orientation.LANDSCAPE
                ? this.landscapeSpread
                : this.portraitSpread;
        }
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
     * Get the total number of pages
     */
    public getPageCount(): number {
        return this.pages.length;
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
     * Show next spread
     */
    public showNext(): void {
        if (this.totalVirtualPages) {
            if (this.isInLoopZone()) {
                this.virtualSpreadIndex++;
                this.showSpread();
            } else {
                if (this.virtualSpreadIndex < this.getSpread(true).length) {
                    // this.getSpread(true).length - 1
                    // 문제 있으면 아래로 변경 해야할지도?
                    this.currentSpreadIndex++;
                    this.virtualSpreadIndex++;
                    this.showSpread();
                }
            }
        } else {
            if (this.currentSpreadIndex < this.getSpread().length) {
                //this.getSpread().length - 1
                this.currentSpreadIndex++;
                this.showSpread();
            }
        }
    }

    /**
     * Show prev spread
     */
    public showPrev(): void {
        if (this.totalVirtualPages) {
            if (this.isInLoopZone()) {
                this.virtualSpreadIndex--;
                this.showSpread();
            } else {
                if (this.virtualSpreadIndex > 0) {
                    this.currentSpreadIndex--;
                    this.virtualSpreadIndex--;
                    this.showSpread();
                }
            }
        } else {
            if (this.currentSpreadIndex > 0) {
                this.currentSpreadIndex--;
                this.showSpread();
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

        if (pageNum < 0 || pageNum >= this.getVirtualPageCount()) return;

        const spreadIndex = this.totalVirtualPages
            ? this.getVirtualSpreadIndexByPage(pageNum)
            : this.getSpreadIndexByPage(pageNum);

        if (spreadIndex !== null) {
            if (this.totalVirtualPages) {
                this.virtualSpreadIndex = spreadIndex;
                // 루프존이 아닌 경우에만 currentSpreadIndex 업데이트
                if (!this.isInLoopZone()) {
                    this.currentSpreadIndex = this.getRealSpreadIndex(spreadIndex);
                }
            } else {
                this.currentSpreadIndex = spreadIndex;
            }
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
     */
    private showSpread(): void {
        const spread = this.getSpread()[this.currentSpreadIndex]; // 이부분은 무한루프 만들어야해서 가상화 인덱스 사용안함.

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
            const virtualSpread = this.getSpread(true)[this.virtualSpreadIndex]; // 실제 보여주진 않지만 가상화 인덱스 계산을 위해
            this.virtualPageIndex = virtualSpread[0]; // 가상화 사용시 활성화 될꺼임 아마
            this.app.updatePageIndex(this.virtualPageIndex);
        } else {
            this.app.updatePageIndex(this.currentPageIndex);
        }
    }

    /** 루프 존 계산 및 캐싱 */
    private calculateLoopZone(): void {
        if (!this.totalVirtualPages) {
            return;
        }

        // 가상 스프레드 생성
        this.createVirtualSpreads();

        const realPortraitCount = this.portraitSpread.length;
        const realLandscapeCount = this.landscapeSpread.length;
        const virtualPortraitCount = this.virtualPortraitSpread.length;
        const virtualLandscapeCount = this.virtualLandscapeSpread.length;

        // Portrait 모드 루프존 계산
        if (virtualPortraitCount > realPortraitCount) {
            this.portraitLoopZone.centerIndex = Math.floor(realPortraitCount / 2);
            this.portraitLoopZone.start = this.portraitLoopZone.centerIndex;
            this.portraitLoopZone.end = virtualPortraitCount - this.portraitLoopZone.centerIndex;
        }

        // Landscape 모드 루프존 계산
        if (virtualLandscapeCount > realLandscapeCount) {
            this.landscapeLoopZone.centerIndex = Math.floor(realLandscapeCount / 2);
            this.landscapeLoopZone.start = this.landscapeLoopZone.centerIndex;
            this.landscapeLoopZone.end = virtualLandscapeCount - this.landscapeLoopZone.centerIndex;
        }
    }

    /** 가상 스프레드 생성 */
    private createVirtualSpreads(): void {
        this.virtualLandscapeSpread = [];
        this.virtualPortraitSpread = [];

        // Portrait 가상 스프레드 (각 페이지가 개별 스프레드)
        for (let i = 0; i < this.totalVirtualPages; i++) {
            this.virtualPortraitSpread.push([i]);
        }

        // Landscape 가상 스프레드 (2페이지씩 묶음, 홀수일 경우 마지막은 단독)
        for (let i = 0; i < this.totalVirtualPages; i += 2) {
            if (i < this.totalVirtualPages - 1) {
                this.virtualLandscapeSpread.push([i, i + 1]);
            } else {
                this.virtualLandscapeSpread.push([i]);
            }
        }
    }

    // /** 루프 존 체크 (최적화됨) */
    // public isInLoopZone(): boolean {
    //     if (!this.totalVirtualPages) return false;

    //     return (
    //         this.virtualSpreadIndex >= this.loopZoneStart &&
    //         this.virtualSpreadIndex < this.loopZoneEnd
    //     );
    // }

    /** 루프 존 체크 - orientation별로 구분 */
    public isInLoopZone(): boolean {
        if (!this.totalVirtualPages) return false;

        const isLandscape = this.render.getOrientation() === Orientation.LANDSCAPE;
        const loopZone = isLandscape ? this.landscapeLoopZone : this.portraitLoopZone;

        return this.virtualSpreadIndex >= loopZone.start && this.virtualSpreadIndex < loopZone.end;
    }

    /**
     * Get spread index by page number
     *
     * @param {number} pageNum - page index
     */
    /** 가상 페이지 번호로 스프레드 인덱스 찾기 - 개선된 버전 */
    public getVirtualSpreadIndexByPage(pageNum: number): number {
        if (!this.totalVirtualPages) {
            return this.getSpreadIndexByPage(pageNum);
        }

        const isLandscape = this.render.getOrientation() === Orientation.LANDSCAPE;
        const virtualSpread = this.getSpread(true);
        const realSpread = this.getSpread(false);
        const loopZone = isLandscape ? this.landscapeLoopZone : this.portraitLoopZone;

        // 1. 루프존 이전 구간 확인
        for (let i = 0; i < loopZone.start; i++) {
            if (this.isPageInSpread(pageNum, virtualSpread[i])) {
                return i;
            }
        }

        // 2. 루프존 구간 확인
        if (pageNum >= loopZone.start && pageNum < loopZone.end) {
            return loopZone.centerIndex;
        }

        // 3. 루프존 이후 구간 확인
        const endOffset = virtualSpread.length - loopZone.end;
        for (let i = 0; i < endOffset; i++) {
            const virtualIndex = loopZone.end + i;
            const realIndex = realSpread.length - endOffset + i;

            if (
                virtualIndex < virtualSpread.length &&
                this.isPageInSpread(pageNum, virtualSpread[virtualIndex])
            ) {
                return virtualIndex;
            }
        }

        return null;
    }

    /** 페이지가 해당 스프레드에 포함되는지 확인 */
    private isPageInSpread(pageNum: number, spread: NumberArray): boolean {
        return spread.includes(pageNum);
    }

    /** 가상 스프레드 인덱스를 실제 스프레드 인덱스로 변환 */
    private getRealSpreadIndex(virtualSpreadIndex: number): number {
        if (!this.totalVirtualPages) {
            return virtualSpreadIndex;
        }

        const isLandscape = this.render.getOrientation() === Orientation.LANDSCAPE;
        const loopZone = isLandscape ? this.landscapeLoopZone : this.portraitLoopZone;

        // 루프존 이전
        if (virtualSpreadIndex < loopZone.start) {
            return virtualSpreadIndex;
        }

        // 루프존 내부
        if (virtualSpreadIndex >= loopZone.start && virtualSpreadIndex < loopZone.end) {
            return loopZone.centerIndex;
        }

        // 루프존 이후
        const realSpread = this.getSpread(false);
        const endOffset = this.getSpread(true).length - loopZone.end;
        return realSpread.length - endOffset + (virtualSpreadIndex - loopZone.end);
    }

    /** 전체 가상 페이지 수 반환 */
    private getVirtualPageCount(): number {
        return this.totalVirtualPages || this.pages.length;
    }

    /** 현재 가상 스프레드 인덱스 반환 */
    public getVirtualSpreadIndex(): number {
        return this.virtualSpreadIndex;
    }

    /** 가상 스프레드 인덱스 설정 */
    public setVirtualSpreadIndex(index: number): void {
        if (index >= 0 && index < this.getSpread(true).length) {
            this.virtualSpreadIndex = index;
        }
    }
}
