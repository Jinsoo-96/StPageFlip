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
    protected loopZoneStart = 0;
    protected loopZoneEnd = 0;
    protected loopSpreadIndex = 0;

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
        console.log('showNext 시작:', {
            totalVirtualPages: this.totalVirtualPages,
            isInLoopZone: this.isInLoopZone(),
            currentSpreadIndex: this.currentSpreadIndex,
            virtualSpreadIndex: this.virtualSpreadIndex,
            orientation: this.render.getOrientation(),
        });
        if (this.totalVirtualPages) {
            if (this.isInLoopZone()) {
                console.log('루프존 브랜치 실행');
                this.virtualSpreadIndex++;
                this.showSpread();
            } else {
                if (this.virtualSpreadIndex < this.getSpread(true).length) {
                    // 문제 있으면 -1 추가 해야할지도?
                    console.log('일반 브랜치 실행');
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

    /** 루프 존 계산 및 캐싱 */
    private calculateLoopZone(): void {
        if (!this.totalVirtualPages) {
            return;
        }
        this.virtualLandscapeSpread = [];
        this.virtualPortraitSpread = [];

        for (let i = 0; i < this.totalVirtualPages; i++) {
            this.virtualPortraitSpread.push([i]);
        }

        for (let i = 0; i < this.totalVirtualPages; i += 2) {
            this.virtualLandscapeSpread.push([i, i + 1]);
        }

        const realSpreadCount = this.getSpread(false).length;
        const virtualSpreadCount = this.getSpread(true).length;

        if (this.render.getOrientation() === Orientation.LANDSCAPE) {
            // LANDSCAPE: PORTRAIT의 절반이므로 한 번 더 절반으로
            this.loopSpreadIndex = Math.floor(realSpreadCount / 2 / 2);
            // 또는 더 간단하게
            this.loopSpreadIndex = Math.floor(realSpreadCount / 4);
        } else {
            // PORTRAIT: 기존 방식
            this.loopSpreadIndex = Math.floor(realSpreadCount / 2);
        }

        this.loopZoneStart = this.loopSpreadIndex;
        this.loopZoneEnd = virtualSpreadCount - this.loopSpreadIndex;
        // }
    }

    /** 루프 존 체크 (최적화됨) */
    public isInLoopZone(): boolean {
        if (!this.totalVirtualPages) return false;

        console.log('현재 가상 페이지 인덱스', this.virtualPageIndex);
        console.log('현재 가상 스프레드 인덱스', this.virtualSpreadIndex);
        console.log('펼침 배열', this.virtualLandscapeSpread);
        console.log('접힘 배열', this.virtualPortraitSpread);
        console.log('루프존 시작', this.loopZoneStart, '끝', this.loopZoneEnd);
        console.log('실제 물리 페이지', this.currentPageIndex);
        return (
            this.virtualSpreadIndex >= this.loopZoneStart && // >=
            this.virtualSpreadIndex < this.loopZoneEnd
        );
    }

    /**
     * Get spread index by page number
     *
     * @param {number} pageNum - page index
     */
    public getVirtualSpreadIndexByPage(pageNum: number): number {
        const spread = this.getSpread();
        const virtualSpread = this.getSpread(true);
        let virtualSpreadLength = 0;

        // 루프존 로직 검토해야 하긴 함
        // 2. 루프 존이라면, 중앙에 해당하는 스프레드 인덱스를 반환합니다.

        for (let i = 0; i < this.loopZoneStart; i++)
            if (pageNum === spread[i][0] || pageNum === spread[i][1]) return i;

        virtualSpreadLength = virtualSpread.length;
        if (this.loopZoneStart <= pageNum && pageNum < virtualSpreadLength) {
            return this.loopSpreadIndex;
        }

        let lastTrace = 0;
        for (let i = virtualSpreadLength - 1; i >= this.loopZoneEnd; i--) {
            // 배열 길이가 5면 인덱스는 0~4인데, 5부터 시작함 그래서 -1
            if (pageNum === virtualSpread[i][0] || pageNum === virtualSpread[i][1])
                spread.length - lastTrace - 1;
            lastTrace++;
        }

        return null;
    }
}
