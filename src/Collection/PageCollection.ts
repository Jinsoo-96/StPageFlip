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
    // /** 루프 존 관련 캐시 */
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
        this.virtualSpreadIndex = 0;
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
            if (this.isInLoopZone('NEXT')) {
                this.virtualSpreadIndex++;
                this.showSpread();
            } else {
                if (this.virtualSpreadIndex < this.getSpread(true).length) {
                    this.currentSpreadIndex++;
                    this.virtualSpreadIndex++;
                    this.showSpread();
                }
            }
        } else {
            if (this.currentSpreadIndex < this.getSpread().length) {
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
            if (this.isInLoopZone('PREV')) {
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

        if (pageNum < 0 || pageNum >= this.pages.length) return;

        const spreadIndex = this.totalVirtualPages
            ? this.getVirtualSpreadIndexByPage(pageNum)
            : this.getSpreadIndexByPage(pageNum);

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

    // Virtual Spread 배열 생성 최적화
    private buildVirtualSpreads(): void {
        if (!this.totalVirtualPages) return;

        // Portrait: 더 효율적인 생성
        this.virtualPortraitSpread = Array.from({ length: this.totalVirtualPages }, (_, i) => [i]);

        // Landscape: 더 효율적인 생성
        this.virtualLandscapeSpread = Array.from(
            { length: Math.ceil(this.totalVirtualPages / 2) },
            (_, i) => [i * 2, i * 2 + 1 < this.totalVirtualPages ? i * 2 + 1 : i * 2],
        );
    }

    /** 루프 존 계산 및 캐싱 */
    private calculateLoopZone(): void {
        if (!this.totalVirtualPages) {
            return;
        }

        this.buildVirtualSpreads();

        this.portraitLoopZone.centerIndex = Math.floor(this.portraitSpread.length / 2);
        this.portraitLoopZone.start = this.portraitLoopZone.centerIndex;
        this.portraitLoopZone.end =
            this.virtualPortraitSpread.length - this.portraitLoopZone.centerIndex;
        this.landscapeLoopZone.centerIndex = Math.floor(this.landscapeSpread.length / 2);
        this.landscapeLoopZone.start = this.landscapeLoopZone.centerIndex;
        this.landscapeLoopZone.end =
            this.virtualLandscapeSpread.length - this.landscapeLoopZone.centerIndex;

        // }
    }

    /** 루프 존 체크 (최적화됨) */
    public isInLoopZone(direction: 'NEXT' | 'PREV'): boolean {
        if (!this.totalVirtualPages) return false;

        let loopZoneStart = 0;
        let loopZoneEnd = 0;

        if (this.render.getOrientation() === Orientation.LANDSCAPE) {
            loopZoneStart = this.landscapeLoopZone.start;
            loopZoneEnd = this.landscapeLoopZone.end;
        } else {
            loopZoneStart = this.portraitLoopZone.start;
            loopZoneEnd = this.portraitLoopZone.end;
        }

        if (direction === 'NEXT') {
            return (
                this.virtualSpreadIndex >= loopZoneStart && this.virtualSpreadIndex < loopZoneEnd
            );
        } else {
            // PREV
            return (
                this.virtualSpreadIndex > loopZoneStart && this.virtualSpreadIndex <= loopZoneEnd
            );
        }
    }

    /**
     * Get virtual spread index by page number (virtualSpreadIndex 설정 포함)
     *
     * @param {number} pageNum - 찾고자 하는 페이지 번호
     */
    public getVirtualSpreadIndexByPage(pageNum: number): number | null {
        if (!this.totalVirtualPages) return null;

        const spread = this.getSpread(); // 실제 스프레드
        const isLandscape = this.render.getOrientation() === Orientation.LANDSCAPE;

        const loopZoneStart = isLandscape
            ? this.landscapeLoopZone.start
            : this.portraitLoopZone.start;
        const loopZoneEnd = isLandscape ? this.landscapeLoopZone.end : this.portraitLoopZone.end;

        let resultVirtualSpreadIndex = null;

        // 1단계: 루프 존 이전 영역 (실제 페이지와 1:1 매핑)
        for (let i = 0; i < Math.min(loopZoneStart, spread.length); i++) {
            if (pageNum === spread[i][0] || pageNum === spread[i][1]) {
                resultVirtualSpreadIndex = i;
                break;
            }
        }

        // 2단계: 루프 존 영역 (가상 페이지 범위)
        if (resultVirtualSpreadIndex === null) {
            if (isLandscape) {
                // Landscape: [[0,1], [2,3], [4,5]...]
                const virtualSpreadIndex = Math.floor(pageNum / 2);
                if (virtualSpreadIndex >= loopZoneStart && virtualSpreadIndex < loopZoneEnd) {
                    resultVirtualSpreadIndex = virtualSpreadIndex;
                }
            } else {
                // Portrait: [[0], [1], [2]...]
                if (pageNum >= loopZoneStart && pageNum < loopZoneEnd) {
                    resultVirtualSpreadIndex = pageNum;
                }
            }
        }

        // 3단계: 루프 존 이후 영역 (실제 페이지와 역순 매핑)
        if (resultVirtualSpreadIndex === null) {
            const virtualSpreadLength = isLandscape
                ? this.virtualLandscapeSpread.length
                : this.virtualPortraitSpread.length;

            for (let i = spread.length - 1; i >= loopZoneStart; i--) {
                const reverseIndex = spread.length - 1 - i;
                const targetVirtualIndex = virtualSpreadLength - 1 - reverseIndex;

                if (pageNum === spread[i][0] || pageNum === spread[i][1]) {
                    resultVirtualSpreadIndex = targetVirtualIndex;
                    break;
                }
            }
        }

        // virtualSpreadIndex 설정
        if (resultVirtualSpreadIndex !== null) {
            this.virtualSpreadIndex = resultVirtualSpreadIndex;
        }

        return resultVirtualSpreadIndex;
    }
}
