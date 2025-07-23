import { Orientation, Render } from '../Render/Render';
import { PageFlip } from '../PageFlip';
import { Helper } from '../Helper';
import { PageRect, Point } from '../BasicTypes';
import { FlipCalculation } from './FlipCalculation';
import { Page, PageDensity } from '../Page/Page';

/**
 * Flipping direction
 */
export const enum FlipDirection {
    FORWARD,
    BACK,
}

/**
 * Active corner when flipping
 */
export const enum FlipCorner {
    TOP = 'top',
    BOTTOM = 'bottom',
}

/**
 * State of the book
 */
export const enum FlippingState {
    /** The user folding the page */
    USER_FOLD = 'user_fold',

    /** Mouse over active corners */
    FOLD_CORNER = 'fold_corner',

    /** During flipping animation */
    FLIPPING = 'flipping',

    /** Base state */
    READ = 'read',
}

/**
 * Class representing the flipping process
 */
export class Flip {
    private readonly render: Render;
    private readonly app: PageFlip;

    private flippingPage: Page = null;
    private bottomPage: Page = null;

    private calc: FlipCalculation = null;

    private state: FlippingState = FlippingState.READ;

    // 🎯 커버 애니메이션 관련 속성 추가
    private coverAnimation: {
        isActive: boolean;
        isLifting: boolean;
        startTime: number;
        duration: number;
        startProgress: number;
        targetProgress: number;
        animationId?: number;
    } = {
        isActive: false,
        isLifting: false,
        startTime: 0,
        duration: 0,
        startProgress: 0,
        targetProgress: 0,
    };

    constructor(render: Render, app: PageFlip) {
        this.render = render;
        this.app = app;
    }

    /**
     * Called when the page folding (User drags page corner)
     *
     * @param globalPos - Touch Point Coordinates (relative window)
     */
    public fold(globalPos: Point): void {
        this.setState(FlippingState.USER_FOLD);

        // If the process has not started yet
        if (this.calc === null) this.start(globalPos);

        this.do(this.render.convertToPage(globalPos));
    }

    /**
     * Page turning with animation
     *
     * @param globalPos - Touch Point Coordinates (relative window)
     */
    public flip(globalPos: Point): void {
        if (this.app.getSettings().disableFlipByClick && !this.isPointOnCorners(globalPos)) return;

        // the flipiing process is already running
        if (this.calc !== null) this.render.finishAnimation();

        if (!this.start(globalPos)) return;

        const rect = this.getBoundsRect();

        this.setState(FlippingState.FLIPPING);

        // Margin from top to start flipping
        const topMargins = rect.height / 10;

        // Defining animation start points
        const yStart =
            this.calc.getCorner() === FlipCorner.BOTTOM ? rect.height - topMargins : topMargins;

        const yDest = this.calc.getCorner() === FlipCorner.BOTTOM ? rect.height : 0;

        // Сalculations for these points
        this.calc.calc({ x: rect.pageWidth - topMargins, y: yStart });

        // Run flipping animation
        this.animateFlippingTo(
            { x: rect.pageWidth - topMargins, y: yStart },
            { x: -rect.pageWidth, y: yDest },
            true,
        );
    }

    /**
     * Start the flipping process. Find direction and corner of flipping. Creating an object for calculation.
     *
     * @param {Point} globalPos - Touch Point Coordinates (relative window)
     *
     * @returns {boolean} True if flipping is possible, false otherwise
     */
    public start(globalPos: Point): boolean {
        this.reset();

        const bookPos = this.render.convertToBook(globalPos);
        const rect = this.getBoundsRect();

        // Find the direction of flipping
        const direction = this.getDirectionByPoint(bookPos);

        // Find the active corner
        const flipCorner = bookPos.y >= rect.height / 2 ? FlipCorner.BOTTOM : FlipCorner.TOP;

        if (!this.checkDirection(direction)) return false;

        try {
            this.flippingPage = this.app.getPageCollection().getFlippingPage(direction);
            this.bottomPage = this.app.getPageCollection().getBottomPage(direction);

            // In landscape mode, needed to set the density  of the next page to the same as that of the flipped
            if (this.render.getOrientation() === Orientation.LANDSCAPE) {
                if (direction === FlipDirection.BACK) {
                    const nextPage = this.app.getPageCollection().nextBy(this.flippingPage);

                    if (nextPage !== null) {
                        if (this.flippingPage.getDensity() !== nextPage.getDensity()) {
                            this.flippingPage.setDrawingDensity(PageDensity.HARD);
                            nextPage.setDrawingDensity(PageDensity.HARD);
                        }
                    }
                } else {
                    const prevPage = this.app.getPageCollection().prevBy(this.flippingPage);

                    if (prevPage !== null) {
                        if (this.flippingPage.getDensity() !== prevPage.getDensity()) {
                            this.flippingPage.setDrawingDensity(PageDensity.HARD);
                            prevPage.setDrawingDensity(PageDensity.HARD);
                        }
                    }
                }
            }

            this.render.setDirection(direction);
            this.calc = new FlipCalculation(
                direction,
                flipCorner,
                rect.pageWidth.toString(10), // fix bug with type casting
                rect.height.toString(10), // fix bug with type casting
            );

            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Perform calculations for the current page position. Pass data to render object
     *
     * @param {Point} pagePos - Touch Point Coordinates (relative active page)
     */
    private do(pagePos: Point): void {
        if (this.calc === null) return; // Flipping process not started

        if (this.calc.calc(pagePos)) {
            // Perform calculations for a specific position
            const progress = this.calc.getFlippingProgress();

            this.bottomPage.setArea(this.calc.getBottomClipArea());
            this.bottomPage.setPosition(this.calc.getBottomPagePosition());
            this.bottomPage.setAngle(0);
            this.bottomPage.setHardAngle(0);

            this.flippingPage.setArea(this.calc.getFlippingClipArea());
            this.flippingPage.setPosition(this.calc.getActiveCorner());
            this.flippingPage.setAngle(this.calc.getAngle());

            if (this.calc.getDirection() === FlipDirection.FORWARD) {
                this.flippingPage.setHardAngle((90 * (200 - progress * 2)) / 100);
            } else {
                this.flippingPage.setHardAngle((-90 * (200 - progress * 2)) / 100);
            }

            this.render.setPageRect(this.calc.getRect());

            this.render.setBottomPage(this.bottomPage);
            this.render.setFlippingPage(this.flippingPage);

            this.render.setShadowData(
                this.calc.getShadowStartPoint(),
                this.calc.getShadowAngle(),
                progress,
                this.calc.getDirection(),
            );
        }
    }

    /**
     * Turn to the specified page number (with animation)
     *
     * @param {number} page - New page number
     * @param {FlipCorner} corner - Active page corner when turning
     */
    public flipToPage(page: number, corner: FlipCorner): void {
        const current = this.app.getPageCollection().getCurrentSpreadIndex();
        const next = this.app.getPageCollection().getSpreadIndexByPage(page);

        try {
            if (next > current) {
                this.app.getPageCollection().setCurrentSpreadIndex(next - 1);
                this.flipNext(corner);
            }
            if (next < current) {
                this.app.getPageCollection().setCurrentSpreadIndex(next + 1);
                this.flipPrev(corner);
            }
        } catch (e) {
            //
        }
    }

    /**
     * Turn to the next page (with animation)
     *
     * @param {FlipCorner} corner - Active page corner when turning
     */
    public flipNext(corner: FlipCorner): void {
        this.flip({
            x: this.render.getRect().left + this.render.getRect().pageWidth * 2 - 10,
            y: corner === FlipCorner.TOP ? 1 : this.render.getRect().height - 2,
        });
    }

    /**
     * Turn to the prev page (with animation)
     *
     * @param {FlipCorner} corner - Active page corner when turning
     */
    public flipPrev(corner: FlipCorner): void {
        this.flip({
            x: this.render.getRect().left + 10,
            y: corner === FlipCorner.TOP ? 1 : this.render.getRect().height - 2,
        });
    }

    /**
     * Called when the user has stopped flipping
     */
    public stopMove(): void {
        if (this.calc === null) return;

        const pos = this.calc.getPosition();
        const rect = this.getBoundsRect();

        const y = this.calc.getCorner() === FlipCorner.BOTTOM ? rect.height : 0;

        if (pos.x <= 0) this.animateFlippingTo(pos, { x: -rect.pageWidth, y }, true);
        else this.animateFlippingTo(pos, { x: rect.pageWidth, y }, false);
    }

    /**
     * Fold the corners of the book when the mouse pointer is over them.
     * Called when the mouse pointer is over the book without clicking
     *
     * @param globalPos
     */
    // 🎯 수정된 showCorner 메서드
    public showCorner(globalPos: Point): void {
        if (!this.checkState(FlippingState.READ, FlippingState.FOLD_CORNER)) return;

        const rect = this.getBoundsRect();
        const pageWidth = rect.pageWidth;
        const coverDuration = this.app.getSettings().coverDuration || 0;

        if (this.isPointOnCorners(globalPos)) {
            if (this.calc === null) {
                if (!this.start(globalPos)) return;
                this.setState(FlippingState.FOLD_CORNER);

                // 🎯 하드 페이지 + coverDuration 설정이 있는 경우
                if (coverDuration > 0 && this.isHardPage()) {
                    this.startCoverAnimation(true, coverDuration); // 들어올리기
                } else {
                    // 🎯 기존 로직 (소프트 페이지 또는 coverDuration = 0)
                    this.calc.calc({ x: pageWidth - 1, y: 1 });
                    const fixedCornerSize = 50;
                    const yStart =
                        this.calc.getCorner() === FlipCorner.BOTTOM ? rect.height - 1 : 1;
                    const yDest =
                        this.calc.getCorner() === FlipCorner.BOTTOM
                            ? rect.height - fixedCornerSize
                            : fixedCornerSize;

                    this.animateFlippingTo(
                        { x: pageWidth - 1, y: yStart },
                        { x: pageWidth - fixedCornerSize, y: yDest },
                        false,
                        false,
                    );
                }
            } else {
                // 🎯 소프트 페이지는 기존 로직 그대로
                if (!this.isHardPage()) {
                    this.do(this.render.convertToPage(globalPos));
                }
                // 하드 페이지는 애니메이션 중이면 아무것도 하지 않음
            }
        } else {
            // 🎯 코너에서 벗어남
            if (
                coverDuration > 0 &&
                this.isHardPage() &&
                (this.coverAnimation.isActive || this.state === FlippingState.FOLD_CORNER)
            ) {
                // 🔥 애니메이션 중이거나 FOLD_CORNER 상태면 천천히 내리기
                this.startCoverAnimation(false, coverDuration);
            } else {
                // 기존 로직
                this.setState(FlippingState.READ);
                this.render.finishAnimation();
                this.stopMove();
            }
        }
    }

    /**
     * Starting the flipping animation process
     *
     * @param {Point} start - animation start point
     * @param {Point} dest - animation end point
     * @param {boolean} isTurned - will the page turn over, or just bring it back
     * @param {boolean} needReset - reset the flipping process at the end of the animation
     */
    private animateFlippingTo(
        start: Point,
        dest: Point,
        isTurned: boolean,
        needReset = true,
    ): void {
        const points = Helper.GetCordsFromTwoPoint(start, dest);

        // Create frames
        const frames = [];
        for (const p of points) frames.push(() => this.do(p));

        const duration = this.getAnimationDuration(points.length);

        if (isTurned && this.app.getOrientation() === Orientation.LANDSCAPE) {
            if (this.calc.getDirection() === FlipDirection.BACK) {
                if (this.app.getCurrentPageIndex() === 1) {
                    this.app.getUI().firstPageCenterWithAnimation();
                } else if (this.app.getCurrentPageIndex() === this.app.getPageCount() - 1) {
                    this.app.getUI().firstPageCenterReverseWithAnimation();
                }
            } else {
                if (this.app.getCurrentPageIndex() === 0) {
                    this.app.getUI().firstPageCenterReverseWithAnimation();
                } else if (this.app.getCurrentPageIndex() === this.app.getPageCount() - 3) {
                    this.app.getUI().firstPageEndCenterWithAnimation();
                }
            }
        }

        this.render.startAnimation(frames, duration, () => {
            // 🎯 콜백에서는 중앙 정렬 제거, 페이지 전환만
            if (!this.calc) return;

            if (isTurned) {
                if (this.calc.getDirection() === FlipDirection.BACK) {
                    this.app.turnToPrevPage();
                } else {
                    this.app.turnToNextPage();
                }
            }

            if (needReset) {
                this.render.setBottomPage(null);
                this.render.setFlippingPage(null);
                this.render.clearShadow();
                this.setState(FlippingState.READ);
                this.reset();
            }
        });
    }
    /**
     * Get the current calculations object
     */
    public getCalculation(): FlipCalculation {
        return this.calc;
    }

    /**
     * Get current flipping state
     */
    public getState(): FlippingState {
        return this.state;
    }

    private setState(newState: FlippingState): void {
        if (this.state !== newState) {
            this.app.updateState(newState);
            this.state = newState;
        }
    }

    private getDirectionByPoint(touchPos: Point): FlipDirection {
        const rect = this.getBoundsRect();

        if (this.render.getOrientation() === Orientation.PORTRAIT) {
            if (touchPos.x - rect.pageWidth <= rect.width / 5) {
                return FlipDirection.BACK;
            }
        } else if (touchPos.x < rect.width / 2) {
            return FlipDirection.BACK;
        }

        return FlipDirection.FORWARD;
    }

    private getAnimationDuration(size: number): number {
        const defaultTime = this.app.getSettings().flippingTime;

        const rect = this.getBoundsRect();
        const ratio = rect.pageWidth / 300;
        const timePerPoint = defaultTime / 600;

        return (size / ratio) * timePerPoint;
    }

    private checkDirection(direction: FlipDirection): boolean {
        if (direction === FlipDirection.FORWARD)
            return this.app.getCurrentPageIndex() < this.app.getPageCount() - 1;

        return this.app.getCurrentPageIndex() >= 1;
    }

    private reset(): void {
        this.calc = null;
        this.flippingPage = null;
        this.bottomPage = null;

        // 🎯 이 부분을 기존 reset 메서드에 추가
        if (this.coverAnimation.animationId) {
            cancelAnimationFrame(this.coverAnimation.animationId);
        }
    }

    private getBoundsRect(): PageRect {
        return this.render.getRect();
    }

    private checkState(...states: FlippingState[]): boolean {
        for (const state of states) {
            if (this.state === state) return true;
        }

        return false;
    }

    private isPointOnCorners(globalPos: Point): boolean {
        const rect = this.getBoundsRect();
        const pageWidth = rect.pageWidth;

        const sensitivityDivider = this.app.getSettings().cornerSensitivity || 5;
        const operatingDistance =
            Math.sqrt(Math.pow(pageWidth, 2) + Math.pow(rect.height, 2)) / sensitivityDivider;

        const bookPos = this.render.convertToBook(globalPos);

        return (
            bookPos.x > 0 &&
            bookPos.y > 0 &&
            bookPos.x < rect.width &&
            bookPos.y < rect.height &&
            (bookPos.x < operatingDistance || bookPos.x > rect.width - operatingDistance) &&
            (bookPos.y < operatingDistance || bookPos.y > rect.height - operatingDistance)
        );
    }
    // 🎯 새로운 private 메서드들을 여기에 추가
    private isHardPage(): boolean {
        return this.flippingPage !== null && this.flippingPage.getDensity() === PageDensity.HARD;
    }

    private startCoverAnimation(isLifting: boolean, duration: number): void {
        if (this.coverAnimation.animationId) {
            cancelAnimationFrame(this.coverAnimation.animationId);
        }

        const currentProgress = this.getCurrentCoverProgress();

        this.coverAnimation = {
            isActive: true,
            isLifting: isLifting,
            startTime: performance.now(),
            duration: duration,
            startProgress: currentProgress,
            targetProgress: isLifting ? 1 : 0,
        };

        this.runCoverAnimation();
    }

    private getCurrentCoverProgress(): number {
        if (!this.coverAnimation.isActive) {
            return 0;
        }

        const elapsed = performance.now() - this.coverAnimation.startTime;
        const progress = Math.min(elapsed / this.coverAnimation.duration, 1);
        const easedProgress = this.easeOut(progress);

        return (
            this.coverAnimation.startProgress +
            (this.coverAnimation.targetProgress - this.coverAnimation.startProgress) * easedProgress
        );
    }

    private runCoverAnimation(): void {
        if (!this.coverAnimation.isActive) return;

        const elapsed = performance.now() - this.coverAnimation.startTime;
        const progress = Math.min(elapsed / this.coverAnimation.duration, 1);
        const easedProgress = this.easeOut(progress);

        const currentProgress =
            this.coverAnimation.startProgress +
            (this.coverAnimation.targetProgress - this.coverAnimation.startProgress) *
                easedProgress;

        this.updateCoverPosition(currentProgress);

        if (progress < 1) {
            this.coverAnimation.animationId = requestAnimationFrame(() => this.runCoverAnimation());
        } else {
            this.finishCoverAnimation();
        }
    }

    private updateCoverPosition(progress: number): void {
        if (!this.calc) return;

        const rect = this.getBoundsRect();
        const pageWidth = rect.pageWidth;
        const fixedCornerSize = 50;

        const yStart = this.calc.getCorner() === FlipCorner.BOTTOM ? rect.height - 1 : 1;
        const yEnd =
            this.calc.getCorner() === FlipCorner.BOTTOM
                ? rect.height - fixedCornerSize
                : fixedCornerSize;

        const currentY = yStart + (yEnd - yStart) * progress;
        const currentX = pageWidth - 1 + (pageWidth - fixedCornerSize - (pageWidth - 1)) * progress;

        this.do({ x: currentX, y: currentY });
    }

    private finishCoverAnimation(): void {
        const wasLifting = this.coverAnimation.isLifting;

        this.coverAnimation.isActive = false;
        if (this.coverAnimation.animationId) {
            cancelAnimationFrame(this.coverAnimation.animationId);
            this.coverAnimation.animationId = undefined;
        }

        if (!wasLifting) {
            this.setState(FlippingState.READ);
            this.render.finishAnimation();
            this.stopMove();
        }
    }

    private easeOut(t: number): number {
        return 1 - Math.pow(1 - t, 3);
    }
}
