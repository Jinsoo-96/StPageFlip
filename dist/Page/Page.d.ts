import { Render } from '../Render/Render';
import { Point } from '../BasicTypes';
/**
 * State of the page on the basis of which rendering
 */
export interface PageState {
    /** Page rotation angle */
    angle: number;
    /** Page scope */
    area: Point[];
    /** Page position */
    position: Point;
    /** Rotate angle for hard pages */
    hardAngle: number;
    /** Rotate angle for hard pages at renedering time */
    hardDrawingAngle: number;
}
export declare const enum PageOrientation {
    /** Left side page */
    LEFT = 0,
    /** Right side page */
    RIGHT = 1
}
export declare const enum PageDensity {
    SOFT = "soft",
    HARD = "hard"
}
/**
 * Class representing a book page
 */
export declare abstract class Page {
    /** State of the page on the basis of which rendering */
    protected state: PageState;
    /** Render object */
    protected render: Render;
    /** Page Orientation */
    protected orientation: PageOrientation;
    /** Density at creation */
    protected createdDensity: PageDensity;
    /** Density at the time of rendering (Depends on neighboring pages) */
    protected nowDrawingDensity: PageDensity;
    protected constructor(render: Render, density: PageDensity);
    /**
     * Render static page
     *
     * @param {PageOrientation} orient - Static page orientation
     */
    abstract simpleDraw(orient: PageOrientation): void;
    /**
     * Render dynamic page, using state
     *
     * @param {PageDensity} tempDensity - Density at the time of rendering
     */
    abstract draw(tempDensity?: PageDensity): void;
    /**
     * Page loading
     */
    abstract load(): void;
    /**
     * Set a constant page density
     *
     * @param {PageDensity} density
     */
    setDensity(density: PageDensity): void;
    /**
     * Set temp page density to next render
     *
     * @param {PageDensity}  density
     */
    setDrawingDensity(density: PageDensity): void;
    /**
     * Set page position
     *
     * @param {Point} pagePos
     */
    setPosition(pagePos: Point): void;
    /**
     * Set page angle
     *
     * @param {number} angle
     */
    setAngle(angle: number): void;
    /**
     * Set page crop area
     *
     * @param {Point[]} area
     */
    setArea(area: Point[]): void;
    /**
     * Rotate angle for hard pages to next render
     *
     * @param {number} angle
     */
    setHardDrawingAngle(angle: number): void;
    /**
     * Rotate angle for hard pages
     *
     * @param {number} angle
     */
    setHardAngle(angle: number): void;
    /**
     * Set page orientation
     *
     * @param {PageOrientation} orientation
     */
    setOrientation(orientation: PageOrientation): void;
    /**
     * Get temp page density
     */
    getDrawingDensity(): PageDensity;
    /**
     * Get a constant page density
     */
    getDensity(): PageDensity;
    /**
     * Get rotate angle for hard pages
     */
    getHardAngle(): number;
    abstract newTemporaryCopy(): Page;
    abstract getTemporaryCopy(): Page;
    abstract hideTemporaryCopy(): void;
}
