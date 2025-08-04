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

    // 🎯 가상화 관련 프로퍼티
    /** 가상화 모드 활성화 여부 */
    protected isVirtualMode = false;
    /** 논리적 현재 페이지 인덱스 (가상화 모드에서 사용) */
    protected virtualCurrentPageIndex = 0;

    // 🎯 가상화 스프레드 매핑 (개선)
    protected virtualSpreadMap: {
        start: number[]; // 시작 부분 스프레드 인덱스들
        middle: number[]; // 중간 재사용 스프레드 인덱스들
        end: number[]; // 끝 부분 스프레드 인덱스들
        threshold: number; // 시작/끝 임계값
    } = {
        start: [],
        middle: [],
        end: [],
        threshold: 0,
    };

    protected constructor(app: PageFlip, render: Render) {
        this.render = render;
        this.app = app;

        this.currentPageIndex = 0;
        this.isShowCover = this.app.getSettings().showCover;

        // 🎯 가상화 모드 초기화
        this.isVirtualMode = !!this.app.getSettings().totalVirtualPages;
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

        // 🎯 가상화 모드에서 스프레드 매핑 계산
        if (this.isVirtualMode) {
            this.setupVirtualSpreadMapping();
            console.log('이걸 봐야함', this.virtualSpreadMap);
        }
    }

    /**
     * 🎯 가상화 스프레드 매핑 설정
     */
    private setupVirtualSpreadMapping(): void {
        const spread = this.getSpread();
        const totalVirtualPages = this.app.getSettings().totalVirtualPages || 0;

        if (this.render.getOrientation() === Orientation.PORTRAIT) {
            // Portrait 모드: 처음 3개, 마지막 3개는 그대로, 중간은 재사용
            const startCount = Math.min(3, Math.floor(this.pages.length / 3));
            const endCount = Math.min(3, Math.floor(this.pages.length / 3));
            const middleIndex = Math.floor(this.pages.length / 2);

            this.virtualSpreadMap = {
                start: Array.from({ length: startCount }, (_, i) => i),
                middle: [middleIndex],
                end: Array.from({ length: endCount }, (_, i) => this.pages.length - endCount + i),
                threshold: startCount,
            };
        } else {
            // Landscape 모드: 처음 2개, 마지막 2개 스프레드는 그대로
            if (spread.length >= 5) {
                const startSpreads = 2;
                const endSpreads = 2;
                const middleIndex = Math.floor(spread.length / 2);

                this.virtualSpreadMap = {
                    start: [0, 1],
                    middle: [middleIndex],
                    end: [spread.length - 2, spread.length - 1],
                    threshold: 4, // 처음 4페이지 (2개 스프레드)
                };
            } else {
                // 스프레드가 적은 경우 전체 사용
                this.virtualSpreadMap = {
                    start: Array.from({ length: spread.length }, (_, i) => i),
                    middle: [],
                    end: [],
                    threshold: totalVirtualPages,
                };
            }
        }
    }

    /**
     * 🎯 가상 페이지 인덱스에 해당하는 실제 스프레드 인덱스 반환
     */
    private getVirtualSpreadIndex(virtualPageIndex: number): number {
        const totalVirtualPages = this.app.getSettings().totalVirtualPages || 0;
        const spread = this.getSpread();

        // Portrait 모드
        if (this.render.getOrientation() === Orientation.PORTRAIT) {
            // 시작 부분
            if (virtualPageIndex < this.virtualSpreadMap.start.length) {
                return this.virtualSpreadMap.start[virtualPageIndex];
            }

            // 끝 부분
            const endStartIndex = totalVirtualPages - this.virtualSpreadMap.end.length;
            if (virtualPageIndex >= endStartIndex) {
                const endIndex = virtualPageIndex - endStartIndex;
                return this.virtualSpreadMap.end[endIndex];
            }

            // 중간 부분
            return this.virtualSpreadMap.middle[0];
        }

        // Landscape 모드
        // 시작 부분 (처음 몇 페이지)
        if (virtualPageIndex < this.virtualSpreadMap.threshold) {
            const spreadIndex =
                this.isShowCover && virtualPageIndex === 0
                    ? 0
                    : Math.floor((virtualPageIndex + (this.isShowCover ? 0 : 1)) / 2);
            if (spreadIndex < this.virtualSpreadMap.start.length) {
                return this.virtualSpreadMap.start[spreadIndex];
            }
        }

        // 끝 부분 (마지막 몇 페이지)
        const endThreshold = totalVirtualPages - this.virtualSpreadMap.threshold;
        if (virtualPageIndex >= endThreshold) {
            const pagesFromEnd = totalVirtualPages - virtualPageIndex;
            if (pagesFromEnd <= 4) {
                // 마지막 4페이지
                const endSpreadIndex = pagesFromEnd <= 2 ? spread.length - 1 : spread.length - 2;
                return Math.max(0, endSpreadIndex);
            }
        }

        // 중간 부분 (재사용)
        return this.virtualSpreadMap.middle[0];
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
        // 🎯 가상화 모드에서는 가상 스프레드 인덱스 반환
        if (this.isVirtualMode) {
            return this.getVirtualSpreadIndex(pageNum);
        }

        const spread = this.getSpread();
        for (let i = 0; i < spread.length; i++)
            if (pageNum === spread[i][0] || pageNum === spread[i][1]) return i;

        return null;
    }

    /**
     * Get the total number of pages
     */
    public getPageCount(): number {
        // 🎯 가상화 모드에서는 가상 페이지 수 반환
        if (this.isVirtualMode) {
            return this.app.getSettings().totalVirtualPages;
        }
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
        // 🎯 가상화 모드
        if (this.isVirtualMode) {
            const currentSpreadIndex = this.getVirtualSpreadIndex(this.virtualCurrentPageIndex);
            const spread = this.getSpread()[currentSpreadIndex];

            if (this.render.getOrientation() === Orientation.PORTRAIT) {
                return this.pages[spread[0]].newTemporaryCopy();
            } else {
                if (spread.length === 1) return this.pages[spread[0]];

                return direction === FlipDirection.FORWARD
                    ? this.pages[spread[0]]
                    : this.pages[spread[1]];
            }
        }

        // 기존 로직
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
        // 🎯 가상화 모드
        if (this.isVirtualMode) {
            const increment = this.render.getOrientation() === Orientation.PORTRAIT ? 1 : 2;
            const nextVirtualIndex =
                direction === FlipDirection.FORWARD
                    ? this.virtualCurrentPageIndex + increment
                    : this.virtualCurrentPageIndex - increment;

            // 범위 체크
            if (nextVirtualIndex < 0 || nextVirtualIndex >= this.getPageCount()) {
                return null;
            }

            const nextSpreadIndex = this.getVirtualSpreadIndex(nextVirtualIndex);
            const spread = this.getSpread()[nextSpreadIndex];

            if (this.render.getOrientation() === Orientation.PORTRAIT) {
                return this.pages[spread[0]];
            } else {
                if (spread.length === 1) return this.pages[spread[0]];

                // Landscape에서 가상 페이지 인덱스가 홀수인 경우 처리
                const pageInSpread = nextVirtualIndex % 2;
                return this.pages[spread[pageInSpread]];
            }
        }

        // 기존 로직
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
        // 🎯 가상화 모드
        if (this.isVirtualMode) {
            const totalPages = this.app.getSettings().totalVirtualPages;
            const increment = this.render.getOrientation() === Orientation.PORTRAIT ? 1 : 2;

            if (this.virtualCurrentPageIndex < totalPages - increment) {
                this.virtualCurrentPageIndex += increment;
                this.app.updatePageIndex(this.virtualCurrentPageIndex);
            }
            return;
        }

        // 기존 로직
        if (this.currentSpreadIndex < this.getSpread().length - 1) {
            this.currentSpreadIndex++;
            this.showSpread();
        }
    }

    /**
     * Show prev spread
     */
    public showPrev(): void {
        // 🎯 가상화 모드
        if (this.isVirtualMode) {
            const increment = this.render.getOrientation() === Orientation.PORTRAIT ? 1 : 2;

            if (this.virtualCurrentPageIndex >= increment) {
                this.virtualCurrentPageIndex -= increment;
                this.app.updatePageIndex(this.virtualCurrentPageIndex);
            }
            return;
        }

        // 기존 로직
        if (this.currentSpreadIndex > 0) {
            this.currentSpreadIndex--;
            this.showSpread();
        }
    }

    /**
     * Get the number of the current page in list
     */
    public getCurrentPageIndex(): number {
        // 🎯 가상화 모드에서는 가상 페이지 인덱스 반환
        return this.isVirtualMode ? this.virtualCurrentPageIndex : this.currentPageIndex;
    }

    /**
     * Show specified page
     * @param {number} pageNum - Page index (from 0s)
     */
    public show(pageNum: number = null): void {
        // 🎯 가상화 모드
        if (this.isVirtualMode) {
            if (pageNum === null) pageNum = this.virtualCurrentPageIndex;

            const totalPages = this.app.getSettings().totalVirtualPages;
            if (pageNum < 0 || pageNum >= totalPages) return;

            this.virtualCurrentPageIndex = pageNum;
            const virtualSpreadIndex = this.getVirtualSpreadIndex(pageNum);
            this.currentSpreadIndex = virtualSpreadIndex;
            this.showSpread();
            return;
        }

        // 기존 로직
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
        // 🎯 가상화 모드에서는 현재 가상 페이지의 스프레드 인덱스 반환
        if (this.isVirtualMode) {
            return this.getVirtualSpreadIndex(this.virtualCurrentPageIndex);
        }
        return this.currentSpreadIndex;
    }

    /**
     * Set new spread index as current
     *
     * @param {number} newIndex - new spread index
     */
    public setCurrentSpreadIndex(newIndex: number): void {
        // 🎯 가상화 모드에서는 무시
        if (this.isVirtualMode) {
            return;
        }

        if (newIndex >= 0 && newIndex < this.getSpread().length) {
            this.currentSpreadIndex = newIndex;
        } else {
            throw new Error('Invalid page');
        }
    }

    /**
     * 🎯 가상화 모드 상태 반환
     */
    public isVirtualization(): boolean {
        return this.isVirtualMode;
    }

    /**
     * 🎯 가상 페이지 인덱스 설정 (외부에서 호출 가능)
     */
    public setVirtualPageIndex(pageIndex: number): void {
        if (!this.isVirtualMode) return;

        const totalPages = this.app.getSettings().totalVirtualPages;
        if (pageIndex >= 0 && pageIndex < totalPages) {
            this.virtualCurrentPageIndex = pageIndex;
        }
    }

    /**
     * Show current spread
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

        // 🎯 가상화 모드에서는 가상 페이지 인덱스 사용
        if (this.isVirtualMode) {
            this.app.updatePageIndex(this.virtualCurrentPageIndex);
        } else {
            this.currentPageIndex = spread[0];
            this.app.updatePageIndex(this.currentPageIndex);
        }
    }
}
