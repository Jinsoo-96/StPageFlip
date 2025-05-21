import { Render } from './Render';
import { PageFlip } from '../PageFlip';
import { FlipSetting } from '../Settings';
/**
 * Class responsible for rendering the HTML book
 */
export declare class HTMLRender extends Render {
    /** Parent HTML Element */
    private readonly element;
    /** Pages List as HTMLElements */
    private readonly items;
    private outerShadow;
    private innerShadow;
    private hardShadow;
    private hardInnerShadow;
    /**
     * @constructor
     *
     * @param {PageFlip} app - PageFlip object
     * @param {FlipSetting} setting - Configuration object
     * @param {HTMLElement} element - Parent HTML Element
     */
    constructor(app: PageFlip, setting: FlipSetting, element: HTMLElement);
    private createShadows;
    clearShadow(): void;
    reload(): void;
    /**
     * Draw inner shadow to the hard page
     */
    private drawHardInnerShadow;
    /**
     * Draw outer shadow to the hard page
     */
    private drawHardOuterShadow;
    /**
     * Draw inner shadow to the soft page
     */
    private drawInnerShadow;
    /**
     * Draw outer shadow to the soft page
     */
    private drawOuterShadow;
    /**
     * Draw left static page
     */
    private drawLeftPage;
    /**
     * Draw right static page
     */
    private drawRightPage;
    /**
     * Draw the next page at the time of flipping
     */
    private drawBottomPage;
    protected drawFrame(): void;
    private clear;
    update(): void;
}
