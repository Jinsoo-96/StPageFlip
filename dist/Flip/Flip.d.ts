import { Render } from '../Render/Render';
import { PageFlip } from '../PageFlip';
import { Point } from '../BasicTypes';
import { FlipCalculation } from './FlipCalculation';
/**
 * Flipping direction
 */
export declare const enum FlipDirection {
    FORWARD = 0,
    BACK = 1
}
/**
 * Active corner when flipping
 */
export declare const enum FlipCorner {
    TOP = "top",
    BOTTOM = "bottom"
}
/**
 * State of the book
 */
export declare const enum FlippingState {
    /** The user folding the page */
    USER_FOLD = "user_fold",
    /** Mouse over active corners */
    FOLD_CORNER = "fold_corner",
    /** During flipping animation */
    FLIPPING = "flipping",
    /** Base state */
    READ = "read"
}
/**
 * Class representing the flipping process
 */
export declare class Flip {
    private readonly render;
    private readonly app;
    private flippingPage;
    private bottomPage;
    private calc;
    private state;
    constructor(render: Render, app: PageFlip);
    /**
     * Called when the page folding (User drags page corner)
     *
     * @param globalPos - Touch Point Coordinates (relative window)
     */
    fold(globalPos: Point): void;
    /**
     * Page turning with animation
     *
     * @param globalPos - Touch Point Coordinates (relative window)
     */
    flip(globalPos: Point): void;
    /**
     * Start the flipping process. Find direction and corner of flipping. Creating an object for calculation.
     *
     * @param {Point} globalPos - Touch Point Coordinates (relative window)
     *
     * @returns {boolean} True if flipping is possible, false otherwise
     */
    start(globalPos: Point): boolean;
    /**
     * Perform calculations for the current page position. Pass data to render object
     *
     * @param {Point} pagePos - Touch Point Coordinates (relative active page)
     */
    private do;
    /**
     * Turn to the specified page number (with animation)
     *
     * @param {number} page - New page number
     * @param {FlipCorner} corner - Active page corner when turning
     */
    flipToPage(page: number, corner: FlipCorner): void;
    /**
     * Turn to the next page (with animation)
     *
     * @param {FlipCorner} corner - Active page corner when turning
     */
    flipNext(corner: FlipCorner): void;
    /**
     * Turn to the prev page (with animation)
     *
     * @param {FlipCorner} corner - Active page corner when turning
     */
    flipPrev(corner: FlipCorner): void;
    /**
     * Called when the user has stopped flipping
     */
    stopMove(): void;
    /**
     * Fold the corners of the book when the mouse pointer is over them.
     * Called when the mouse pointer is over the book without clicking
     *
     * @param globalPos
     */
    showCorner(globalPos: Point): void;
    /**
     * Starting the flipping animation process
     *
     * @param {Point} start - animation start point
     * @param {Point} dest - animation end point
     * @param {boolean} isTurned - will the page turn over, or just bring it back
     * @param {boolean} needReset - reset the flipping process at the end of the animation
     */
    private animateFlippingTo;
    /**
     * Get the current calculations object
     */
    getCalculation(): FlipCalculation;
    /**
     * Get current flipping state
     */
    getState(): FlippingState;
    private setState;
    private getDirectionByPoint;
    private getAnimationDuration;
    private checkDirection;
    private reset;
    private getBoundsRect;
    private checkState;
    private isPointOnCorners;
}
